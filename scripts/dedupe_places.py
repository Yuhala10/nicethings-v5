"""Find places published twice and hide the weaker copy.

Uses the importer's duplicate rule (same phone number, same name nearby, or
a close name at the same spot). Of each pair, the copy we know more about
stays published; the other goes back to DRAFT, so nothing is deleted and
the team can restore it from the console.

    python scripts/dedupe_places.py            # list duplicates only
    python scripts/dedupe_places.py --apply    # hide the weaker copies

Every change is written to scripts/dedupe-log-<date>.json.
"""

import argparse
import datetime
import importlib.util
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("importer", os.path.join(HERE, "import_open_places.py"))
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)

COLUMNS = "id,slug,name,category,city,neighborhood,latitude,longitude,phone,status,verified,claimed,source,description,opening_time,website,minimum_price,average_price,created_at"
# A bar and a restaurant at the same spot under one name are usually one
# place filed twice; a hotel and its restaurant are two listings.
GROUPS = {"Restaurant": "food", "Bar": "food", "Cafe": "food", "Bakery": "food", "Club": "food"}
FACILITY_WORDS = {"piscine", "gymnase", "stade", "salle", "terrain", "annexe", "building", "batiment"}


def same_place(a, b):
    """Stricter than the importer: these places are live, so only clear
    cases are hidden. Same kind of place, then a near-identical name close
    by, a close name at the same spot, or the same phone with a related name."""
    if GROUPS.get(a.get("category"), a.get("category")) != GROUPS.get(b.get("category"), b.get("category")):
        return False
    d = importer.metres(a["latitude"], a["longitude"], b["latitude"], b["longitude"])
    if d > 500:
        return False
    words_a, words_b = set(importer.name_key(a["name"]).split()), set(importer.name_key(b["name"]).split())
    # "Piscine du lycée" and "Gymnase du lycée" are two facilities.
    if (words_a ^ words_b) & FACILITY_WORDS:
        return False
    # One common word ("Matango", "Beignetariat") is a kind of place, not a
    # name: far apart, they are different places.
    if max(len(re.findall(r"\w+", a["name"])), len(re.findall(r"\w+", b["name"]))) == 1 and d > 60:
        return False
    score = importer.similarity(a["name"], b["name"])
    same_phone = importer.phone_key(a.get("phone")) and importer.phone_key(a.get("phone")) == importer.phone_key(b.get("phone"))
    return (score >= 0.9 and d <= 150) or (score >= 0.75 and d <= 40) or bool(same_phone and score >= 0.5)
# Where a listing came from, best first: checked in person beats a visitor,
# which beats open data.
SOURCE_RANK = {"field": 0, "submission": 1, "osm": 2, "overture": 3, "foursquare": 4}


def strength(row, photos):
    facts = sum(bool(row.get(key)) for key in ("phone", "description", "opening_time", "website", "neighborhood")) + bool(
        row.get("minimum_price") or row.get("average_price")
    )
    return (
        bool(row.get("verified")),
        bool(row.get("claimed")),
        photos.get(row["id"], 0),
        -SOURCE_RANK.get(row.get("source") or "", 9),
        facts,
        # Older first: its address is the one people may already share.
        -(datetime.datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")).timestamp() if row.get("created_at") else 0),
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    env = importer.load_env()
    db = importer.Supabase(env["NEXT_PUBLIC_SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"])
    rows = []
    while True:
        page = db.request("GET", f"/nt_spots?select={COLUMNS}&status=eq.APPROVED&order=id&limit=1000&offset={len(rows)}")
        rows += page
        if len(page) < 1000:
            break
    rows = [row for row in rows if row.get("latitude") is not None]
    photos = {}
    offset = 0
    while True:
        page = db.request("GET", f"/nt_spot_photos?select=spot_id&order=id&limit=1000&offset={offset}")
        for photo in page:
            photos[photo["spot_id"]] = photos.get(photo["spot_id"], 0) + 1
        offset += len(page)
        if len(page) < 1000:
            break

    # Strongest first, so each place is compared with the ones it would lose to.
    rows.sort(key=lambda row: strength(row, photos), reverse=True)
    kept_by_city = {}
    pairs = []
    for row in rows:
        kept = kept_by_city.setdefault(row.get("city"), [])
        twin = next((other for other in kept if same_place(other, row)), None)
        if twin:
            pairs.append((twin, row))
        else:
            kept.append(row)

    print(f"{len(rows)} published places, {len(pairs)} duplicates.")
    for keep, drop in pairs:
        distance = round(importer.metres(keep["latitude"], keep["longitude"], drop["latitude"], drop["longitude"]))
        print(f"  keep {keep['name']!r} ({keep['source']}) · hide {drop['name']!r} ({drop['source']}) · {distance} m · {keep.get('city')}")

    if not args.apply or not pairs:
        print("Nothing changed (run with --apply to hide the duplicates).")
        return
    log = [{"hidden": drop["id"], "slug": drop["slug"], "kept": keep["id"], "kept_slug": keep["slug"]} for keep, drop in pairs]
    path = os.path.join(HERE, f"dedupe-log-{datetime.date.today().isoformat()}.json")
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(log, handle, ensure_ascii=False, indent=1)
    for keep, drop in pairs:
        db.request("PATCH", f"/nt_spots?id=eq.{drop['id']}", {"status": "DRAFT"}, {"Prefer": "return=minimal"})
    print(f"Hid {len(pairs)} duplicates (now drafts). Log: {path}")


if __name__ == "__main__":
    sys.exit(main())
