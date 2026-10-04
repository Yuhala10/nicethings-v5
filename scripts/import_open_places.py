"""Imports more places in Cameroon's cities from open datasets.

    pip install duckdb
    python scripts/import_open_places.py --dry-run              # what would change
    python scripts/import_open_places.py                        # all 20 cities
    python scripts/import_open_places.py --cities kribi limbe   # only these
    python scripts/import_open_places.py --source foursquare

Sources (both free to reuse, including commercially):
  * Overture Maps Foundation, "places" theme (CDLA Permissive 2.0): businesses
    contributed by Meta, Microsoft and others, each with a confidence score.
  * Foursquare Open Source Places (Apache 2.0).
Google Maps data is NOT used: its terms forbid copying it into another app.

Safe to re-run: a place is matched on (source, source_ref), and anything that
looks like a place NiceThings already has (same name nearby, or almost the
same spot) is skipped, so nothing is duplicated and admin work is never
touched. Confident places are published with their source shown on the
site ("not yet verified"); the rest are drafts for the team.

Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local
or the environment.
"""

import argparse
import json
import math
import os
import re
import sys
import unicodedata
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET

# Kept in sync with lib/cities.ts: slug, name, lat, lng, radius in degrees.
CITIES = [
    ("yaounde", "Yaoundé", 3.8667, 11.5167, 0.13),
    ("douala", "Douala", 4.0511, 9.74, 0.14),
    ("kribi", "Kribi", 2.9406, 9.91, 0.08),
    ("limbe", "Limbé", 4.0167, 9.2, 0.06),
    ("buea", "Buea", 4.1527, 9.241, 0.06),
    ("bafoussam", "Bafoussam", 5.4781, 10.4176, 0.07),
    ("bamenda", "Bamenda", 5.9597, 10.146, 0.08),
    ("ngaoundere", "Ngaoundéré", 7.3167, 13.5833, 0.07),
    ("garoua", "Garoua", 9.3017, 13.3921, 0.07),
    ("maroua", "Maroua", 10.5956, 14.3247, 0.07),
    ("bertoua", "Bertoua", 4.5775, 13.6846, 0.06),
    ("ebolowa", "Ebolowa", 2.9, 11.15, 0.05),
    ("kumba", "Kumba", 4.6363, 9.4469, 0.05),
    ("dschang", "Dschang", 5.45, 10.0667, 0.05),
    ("edea", "Édéa", 3.8, 10.1333, 0.05),
    ("nkongsamba", "Nkongsamba", 4.9547, 9.9404, 0.05),
    ("foumban", "Foumban", 5.7267, 10.9003, 0.05),
    ("mbalmayo", "Mbalmayo", 3.5167, 11.5, 0.04),
    ("sangmelima", "Sangmélima", 2.9333, 11.9833, 0.04),
    ("tiko", "Tiko", 4.075, 9.36, 0.04),
]

# Source categories -> NiceThings categories, matched as whole words on the
# most specific label first. Anything else (banks, schools, churches,
# pharmacies…) is not imported.
CATEGORY_RULES = [
    # Shops selling beauty products are shops, not salons.
    ("Shopping", ["beauty supply", "cosmetic and beauty supply", "cosmetics store", "jewelry store", "jewelry", "jewellery", "jewelry and watches store"]),
    # Overture's broad "beauty and spa" is nearly always a salon; a real spa
    # carries its own "spa" or "day spa" label.
    ("Beauty", ["beauty and spa", "health and beauty", "skin care", "makeup artist", "eyelash service", "nail salon", "hair salon", "beauty salon"]),
    ("Club", ["night club", "nightclub", "dance club", "disco", "discotheque"]),
    ("Bakery", ["bakery", "bakeries", "patisserie", "pastry shop", "cake shop", "dessert shop", "boulangerie", "donut shop"]),
    ("Cafe", ["cafe", "coffee", "coffee shop", "tea room", "tea house", "juice bar", "ice cream", "ice cream shop", "smoothie"]),
    ("Bar", ["bar", "bars", "pub", "lounge", "beer garden", "brewery", "hookah bar", "wine bar", "cocktail bar", "sports bar", "maquis", "bistro", "beer bar"]),
    ("Restaurant", ["restaurant", "restaurants", "fast food", "food court", "diner", "grill", "barbecue", "pizza", "pizzeria", "burger", "burgers", "chicken", "seafood", "steakhouse", "buffet", "eatery", "snack", "food stand", "food truck"]),
    ("Hotel", ["hotel", "hotels", "motel", "guest house", "guesthouse", "hostel", "resort", "lodge", "inn", "bed and breakfast", "auberge", "lodging"]),
    ("Wellness", ["gym", "fitness", "fitness center", "spa", "massage", "yoga", "swimming pool", "sports club", "pilates"]),
    ("Beauty", ["beauty", "beauty salon", "hair salon", "hairdresser", "barber", "barbershop", "nail salon", "cosmetics", "salon"]),
    ("Entertainment", ["cinema", "movie theater", "movie theatre", "bowling", "amusement park", "arcade", "casino", "karaoke", "escape room", "theme park", "water park", "event venue", "playground"]),
    ("Culture", ["museum", "art gallery", "gallery", "theater", "theatre", "monument", "historic site", "cultural center", "cultural centre", "library", "landmark"]),
    ("Nature", ["park", "beach", "garden", "botanical garden", "zoo", "lake", "waterfall", "nature reserve", "forest"]),
    ("Shopping", ["shopping mall", "mall", "shopping center", "supermarket", "market", "boutique", "clothing store", "fashion", "shoe store", "jewelry", "jewellery", "gift shop", "department store"]),
]
RULES = [(category, [re.compile(r"\b" + re.escape(word) + r"\b") for word in words]) for category, words in CATEGORY_RULES]

PUBLISH_DIRECTLY = {"Restaurant", "Bar", "Cafe", "Bakery", "Club", "Hotel", "Culture", "Nature", "Entertainment"}

# Never imported, whatever else the labels say: places people do not "go
# out" to, and look-alikes ("internet cafe" is not a café).
EXCLUDED_LABELS = re.compile(
    r"\b(internet cafe|cyber cafe|cybercafe|travel|agency|agent|school|academy|college|university|training|education|"
    r"hospital|clinic|medical|doctor|dentist|pharmacy|drugstore|church|mosque|religious|bank|atm|insurance|real estate|"
    r"automotive|car dealer|car rental|car wash|auto repair|gas station|fuel|office|consulting|lawyer|legal|accountant|"
    r"government|embassy|wholesale|warehouse|printing|telecommunication|mobile phone|electronics|hardware|construction|"
    r"logistics|transport|bus station|taxi|funeral|optician|optometrist|eyewear|optical|dietitian|nutritionist|"
    r"telecommunications)\b"
)
EXCLUDED_NAMES = re.compile(
    r"\b(academie|académie|academy|ecole|école|school|institut|institute|formation|centre de formation|agence|agency|"
    r"cyber|pharmacie|pharmacy|clinique|hopital|hôpital|eglise|église|church|banque|bank|assurance|optique|optic|optical|"
    r"lunetterie|mtn|orange money|express union)\b",
    re.IGNORECASE,
)

FILLER = {
    "a", "and", "au", "aux", "bar", "boulangerie", "cabaret", "cafe", "chez", "club", "d", "de", "des", "du", "et", "hotel", "l", "la",
    "le", "les", "lounge", "maquis", "patisserie", "resto", "restaurant", "snack", "the", "chambre", "chambres", "auberge", "residence",
}


# ---------------------------------------------------------------- helpers --

def load_env():
    env = dict(os.environ)
    try:
        with open(".env.local", encoding="utf-8") as handle:
            for line in handle:
                match = re.match(r"^([A-Z0-9_]+)=(.*)$", line.strip())
                if match:
                    env.setdefault(match.group(1), match.group(2).strip().strip('"'))
    except FileNotFoundError:
        pass
    return env


def name_key(name):
    text = unicodedata.normalize("NFD", name or "")
    text = "".join(char for char in text if unicodedata.category(char) != "Mn").lower()
    words = re.sub(r"[^a-z0-9]+", " ", text).split()
    return " ".join(word for word in words if word not in FILLER)


def similarity(a, b):
    """Same rule as lib/places/similar.ts: letter pairs of the cleaned names."""
    ka, kb = name_key(a), name_key(b)
    if not ka or not kb:
        return 1.0 if (a or "").strip().lower() == (b or "").strip().lower() else 0.0
    if ka == kb:
        return 1.0
    # Every word of one name inside the other: "Wenge" / "Le Wenge Lounge".
    words_a, words_b = set(ka.split()), set(kb.split())
    shorter, longer = (words_a, words_b) if len(ka) <= len(kb) else (words_b, words_a)
    if len("".join(shorter)) >= 4 and shorter <= longer:
        return 0.9
    left = [ka.replace(" ", "")[i:i + 2] for i in range(len(ka.replace(" ", "")) - 1)]
    right = [kb.replace(" ", "")[i:i + 2] for i in range(len(kb.replace(" ", "")) - 1)]
    if not left or not right:
        return 0.0
    pool = list(right)
    shared = 0
    for pair in left:
        if pair in pool:
            shared += 1
            pool.remove(pair)
    return 2 * shared / (len(left) + len(right))


def metres(lat1, lng1, lat2, lng2):
    rad = math.pi / 180
    d_lat = (lat2 - lat1) * rad
    d_lng = (lng2 - lng1) * rad
    h = math.sin(d_lat / 2) ** 2 + math.cos(lat1 * rad) * math.cos(lat2 * rad) * math.sin(d_lng / 2) ** 2
    return 2 * 6_371_000 * math.asin(math.sqrt(h))


def phone_key(phone):
    """Last 9 digits: "+237 6 79 82 36 92" and "679823692" are the same line."""
    digits = re.sub(r"\D", "", phone or "")
    return digits[-9:] if len(digits) >= 8 else None


def twin_of(name, lat, lng, phone, rows):
    """The place already listed under this one's name, if any. Stricter than
    lib/places/similar.ts because nobody is there to confirm: the same
    phone number, the same name nearby, or a close name at the same spot."""
    key = phone_key(phone)
    for row in rows:
        d = metres(lat, lng, row["latitude"], row["longitude"])
        if d > 3000:
            continue
        if key and key == phone_key(row.get("phone")):
            return row
        if d > 500:
            continue
        score = similarity(name, row["name"])
        if score >= 0.95 or (d <= 150 and score >= 0.75) or (d <= 25 and score >= 0.5):
            return row
    return None


def category_for(labels, name=""):
    """`labels`: the place's own categories, most specific first
    ("african_restaurant", "Cocktail Bar"). Broad parent groups are never
    passed in: "beauty and spa" says nothing about one shop."""
    if EXCLUDED_NAMES.search(name or ""):
        return None
    texts = [re.sub(r"[^a-z]+", " ", (label or "").lower()).strip() for label in labels]
    texts = [text for text in texts if text]
    if not texts or EXCLUDED_LABELS.search(texts[0]):
        return None
    for text in texts:
        for category, patterns in RULES:
            if any(pattern.search(text) for pattern in patterns):
                return category
    return None


def clean_name(name):
    name = re.sub(r"\s+", " ", (name or "")).strip()
    # Names that are only a category ("Restaurant", "Bar") are not places.
    if len(name) < 3 or not name_key(name):
        return None
    return name[:120]


def clean_phone(phone):
    digits = re.sub(r"[^\d+]", "", phone or "")
    return digits[:40] if len(re.sub(r"\D", "", digits)) >= 8 else None


def slugify(text):
    text = unicodedata.normalize("NFD", text)
    text = "".join(char for char in text if unicodedata.category(char) != "Mn").lower()
    return re.sub(r"[^a-z0-9]+", "-", text.replace("&", " et ")).strip("-")


# --------------------------------------------------------------- Supabase --

class Supabase:
    def __init__(self, url, key):
        self.url = url.rstrip("/") + "/rest/v1"
        self.headers = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}

    def request(self, method, path, body=None, extra=None):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(self.url + path, data=data, method=method, headers={**self.headers, **(extra or {})})
        try:
            with urllib.request.urlopen(req, timeout=120) as response:
                text = response.read().decode()
                return json.loads(text) if text else None
        except urllib.error.HTTPError as error:
            hint = " (check the SUPABASE_SERVICE_ROLE_KEY secret)" if error.code in (401, 403) else ""
            raise SystemExit(f"Supabase {method} {path.split('?')[0]} failed: {error.code}{hint} {error.read().decode()[:300]}")
        except urllib.error.URLError as error:
            raise SystemExit(f"Cannot reach Supabase ({error.reason}): check the SUPABASE_URL secret, it should look like https://xxxx.supabase.co")

    def all_spots(self):
        rows = []
        while True:
            page = self.request("GET", f"/nt_spots?select=id,slug,name,city,neighborhood,latitude,longitude,phone,source,source_ref&order=id&limit=1000&offset={len(rows)}")
            rows += page
            if len(page) < 1000:
                return rows

    def insert(self, rows):
        for start in range(0, len(rows), 200):
            self.request("POST", "/nt_spots", rows[start:start + 200], {"Prefer": "return=minimal"})


# ---------------------------------------------------------------- sources --

def duck(hf_token=None):
    try:
        import duckdb
    except ImportError:
        raise SystemExit("Install DuckDB first: pip install duckdb")
    db = duckdb.connect()
    db.execute("INSTALL httpfs; LOAD httpfs;")
    # Foursquare's open data now lives on Hugging Face behind a free sign-up.
    if hf_token and re.fullmatch(r"hf_[A-Za-z0-9]+", hf_token):
        db.execute(f"CREATE SECRET hf (TYPE HUGGINGFACE, TOKEN '{hf_token}')")
    return db


def latest_overture_release():
    url = "https://overturemaps-us-west-2.s3.amazonaws.com/?list-type=2&prefix=release/&delimiter=/"
    with urllib.request.urlopen(url, timeout=60) as response:
        tree = ET.fromstring(response.read())
    names = [node.text for node in tree.iter() if node.tag.endswith("Prefix") and node.text and node.text.startswith("release/2")]
    if not names:
        raise SystemExit("Could not find the latest Overture release.")
    return sorted(names)[-1].rstrip("/").split("/")[-1]


def columns(db, source):
    """Column names and types of a remote dataset (they change between releases)."""
    return {row[0]: str(row[1]) for row in db.execute(f"DESCRIBE SELECT * FROM {source} LIMIT 0").fetchall()}


def overture_places(db, city):
    slug, name, lat, lng, radius = city
    db.execute("SET s3_region='us-west-2'; SET s3_url_style='path';")
    source = f"read_parquet('s3://overturemaps-us-west-2/release/{overture_places.release}/theme=places/type=place/*', hive_partitioning=1)"
    if not hasattr(overture_places, "cols"):
        overture_places.cols = columns(db, source)
    cols = overture_places.cols
    # The place's own category, from whichever field this release has
    # (`taxonomy` replaced `categories`), plus Overture's simplified
    # `basic_category`. Parent groups and alternates are left out on purpose.
    if "primary" in cols.get("taxonomy", ""):
        primary = "taxonomy.primary"
    elif "primary" in cols.get("categories", ""):
        primary = "categories.primary"
    else:
        primary = "NULL"
    basic = "CAST(basic_category AS VARCHAR)" if "basic_category" in cols else "NULL"
    phone = "phones[1]" if "phones" in cols else "NULL"
    website = "websites[1]" if "websites" in cols else "NULL"
    country = "addresses[1].country" if "addresses" in cols else "NULL"
    status = "CAST(operating_status AS VARCHAR)" if "operating_status" in cols else "NULL"
    query = f"""
        SELECT id, names.primary, {primary}, {basic}, confidence, bbox.ymin, bbox.xmin, {phone}, {website}, {country}, {status}
        FROM {source}
        WHERE bbox.xmin BETWEEN {lng - radius} AND {lng + radius}
          AND bbox.ymin BETWEEN {lat - radius} AND {lat + radius}
    """
    for row in db.execute(query).fetchall():
        place_id, place_name, p_primary, p_basic, confidence, p_lat, p_lng, p_phone, p_website, p_country, p_status = row
        if p_country and p_country != "CM":
            continue
        if p_status and "closed" in p_status.lower():
            continue
        yield {
            "ref": place_id,
            "name": place_name,
            "labels": [label for label in (p_primary, p_basic) if label],
            "confidence": confidence or 0,
            "lat": p_lat,
            "lng": p_lng,
            "phone": p_phone,
            "website": p_website,
        }


def foursquare_places(db, city):
    slug, name, lat, lng, radius = city
    source = f"read_parquet('hf://datasets/foursquare/fsq-os-places/release/dt={foursquare_places.release}/places/parquet/*.parquet')"
    if not hasattr(foursquare_places, "cols"):
        foursquare_places.cols = columns(db, source)
    cols = foursquare_places.cols
    labels = "CAST(fsq_category_labels AS VARCHAR)" if "fsq_category_labels" in cols else "''"
    closed = "date_closed" if "date_closed" in cols else "NULL"
    refreshed = "CAST(date_refreshed AS VARCHAR)" if "date_refreshed" in cols else "NULL"
    phone = "tel" if "tel" in cols else "NULL"
    website = "website" if "website" in cols else "NULL"
    query = f"""
        SELECT fsq_place_id, name, {labels}, latitude, longitude, {phone}, {website}, {closed}, {refreshed}
        FROM {source}
        WHERE country = 'CM'
          AND latitude BETWEEN {lat - radius} AND {lat + radius}
          AND longitude BETWEEN {lng - radius} AND {lng + radius}
    """
    for row in db.execute(query).fetchall():
        place_id, place_name, label_text, p_lat, p_lng, p_phone, p_website, p_closed, p_refreshed = row
        if p_closed:
            continue
        # Not refreshed for years: probably gone. Keep it as a draft at best.
        recent = bool(p_refreshed) and str(p_refreshed) >= "2022"
        yield {
            "ref": place_id,
            "name": place_name,
            "labels": [part.split(">")[-1] for part in re.findall(r"[^\[\]',\"]+(?:>[^\[\]',\"]+)*", label_text or "") if part.strip()],
            "confidence": 0.85 if recent else 0.5,
            "lat": p_lat,
            "lng": p_lng,
            "phone": p_phone,
            "website": p_website,
        }


def latest_foursquare_release():
    # The file list is public; reading the files needs the (free) token.
    url = "https://huggingface.co/api/datasets/foursquare/fsq-os-places/tree/main/release"
    with urllib.request.urlopen(url, timeout=60) as response:
        entries = json.loads(response.read())
    names = [entry["path"] for entry in entries if "dt=" in entry.get("path", "")]
    if not names:
        raise SystemExit("Could not find the latest Foursquare release.")
    return sorted(names)[-1].split("dt=")[-1]


# ------------------------------------------------------------------- main --

def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--cities", nargs="*", help="city slugs (default: all)")
    parser.add_argument("--source", choices=["overture", "foursquare", "both"], default="both")
    parser.add_argument("--publish-from", type=float, default=0.8, help="confidence needed to publish (else draft)")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    env = load_env()
    url = (env.get("NEXT_PUBLIC_SUPABASE_URL") or "").strip().strip('"')
    key = (env.get("SUPABASE_SERVICE_ROLE_KEY") or "").strip().strip('"')
    missing = [name for name, value in (("SUPABASE_URL", url), ("SUPABASE_SERVICE_ROLE_KEY", key)) if not value]
    if missing:
        raise SystemExit(f"Missing secret(s): {', '.join(missing)}. Add them under Settings > Secrets and variables > Actions.")
    if not url.startswith("https://"):
        raise SystemExit("The SUPABASE_URL secret should start with https:// (just the address, without the name or quotes).")
    supabase = Supabase(url, key)
    cities = [city for city in CITIES if not args.cities or city[0] in args.cities]

    existing = supabase.all_spots()
    known_refs = {(row["source"], row["source_ref"]) for row in existing if row.get("source_ref")}
    taken_slugs = {row["slug"] for row in existing if row.get("slug")}
    print(f"Connected to Supabase: {len(existing)} places already in NiceThings.")

    hf_token = (env.get("HF_TOKEN") or "").strip()
    db = duck(hf_token)
    sources = []
    if args.source in ("overture", "both"):
        try:
            overture_places.release = latest_overture_release()
            print(f"Overture release {overture_places.release}")
            sources.append(("overture", overture_places))
        except Exception as error:  # noqa: BLE001
            print(f"Overture skipped ({error})")
    if args.source in ("foursquare", "both"):
        if not hf_token:
            print("Foursquare skipped: it needs a free Hugging Face token (HF_TOKEN secret).")
        else:
            try:
                foursquare_places.release = latest_foursquare_release()
                print(f"Foursquare release {foursquare_places.release}")
                sources.append(("foursquare", foursquare_places))
            except Exception as error:  # noqa: BLE001 - optional source
                print(f"Foursquare skipped ({error})")
    if not sources:
        raise SystemExit("No dataset available, nothing to do.")

    totals = {"seen": 0, "kept": 0, "duplicate": 0, "category": 0, "published": 0}
    unmatched = {}  # source categories we skipped, to tune the rules
    new_rows = []
    for city in cities:
        slug, city_name = city[0], city[1]
        # Everything we compare against: what exists plus what this run adds.
        nearby = [row for row in existing if row.get("latitude") is not None and row.get("city") == city_name]
        with_area = [row for row in nearby if row.get("neighborhood")]
        added_here = 0
        for source, fetch in sources:
            try:
                candidates = list(fetch(db, city))
            except Exception as error:  # noqa: BLE001 - one source failing must not stop the rest
                print(f"  {source} failed for {city_name}: {error}")
                continue
            for place in candidates:
                totals["seen"] += 1
                if (source, place["ref"]) in known_refs:
                    continue
                name = clean_name(place["name"])
                category = category_for(place["labels"], place["name"])
                if not name or not category or place["lat"] is None:
                    totals["category"] += 1
                    if place["labels"]:
                        unmatched[place["labels"][0]] = unmatched.get(place["labels"][0], 0) + 1
                    continue
                if twin_of(name, place["lat"], place["lng"], clean_phone(place.get("phone")), nearby):
                    totals["duplicate"] += 1
                    continue
                # Neighbourhood of the closest known place, when close enough.
                area = min(with_area, key=lambda row: metres(place["lat"], place["lng"], row["latitude"], row["longitude"]), default=None)
                neighborhood = area["neighborhood"] if area and metres(place["lat"], place["lng"], area["latitude"], area["longitude"]) <= 700 else None
                base = slugify(" ".join(filter(None, [name, neighborhood, None if slug == "yaounde" else city_name])))[:80] or "lieu"
                unique = base
                number = 2
                while unique in taken_slugs:
                    unique = f"{base}-{number}"
                    number += 1
                taken_slugs.add(unique)
                # Only places people go out to are published straight away;
                # shops, salons and gyms always wait for the team.
                publish = place["confidence"] >= args.publish_from and category in PUBLISH_DIRECTLY
                row = {
                    "slug": unique,
                    "name": name,
                    "category": category,
                    "city": city_name,
                    "neighborhood": neighborhood,
                    "latitude": round(place["lat"], 7),
                    "longitude": round(place["lng"], 7),
                    "phone": clean_phone(place.get("phone")),
                    "website": (place.get("website") or None),
                    "source": source,
                    "source_ref": place["ref"],
                    "status": "APPROVED" if publish else "DRAFT",
                }
                new_rows.append(row)
                nearby.append({**row, "latitude": row["latitude"], "longitude": row["longitude"]})
                known_refs.add((source, place["ref"]))
                totals["kept"] += 1
                totals["published"] += int(publish)
                added_here += 1
        print(f"  {city_name}: {added_here} new places")

    print(
        f"\nSeen {totals['seen']} · new {totals['kept']} (published {totals['published']}, drafts {totals['kept'] - totals['published']})"
        f" · already in NiceThings {totals['duplicate']} · not our kind of place {totals['category']}"
    )
    by_category = {}
    for row in new_rows:
        by_category[row["category"]] = by_category.get(row["category"], 0) + 1
    print("New places by kind: " + ", ".join(f"{name} {count}" for name, count in sorted(by_category.items(), key=lambda item: -item[1])))
    print("Most common skipped kinds: " + ", ".join(f"{name} {count}" for name, count in sorted(unmatched.items(), key=lambda item: -item[1])[:30]))
    if args.dry_run:
        # A spread sample (every Nth place) rather than the first city only.
        step = max(1, len(new_rows) // 40)
        for row in new_rows[::step][:40]:
            print(f"  + [{row['status']}] {row['name']} · {row['category']} · {row['neighborhood'] or '?'} · {row['city']} ({row['source']})")
        print("Dry run: nothing written.")
        return
    supabase.insert(new_rows)
    print(f"Written: {len(new_rows)} places. The site refreshes its catalogue within 5 minutes.")


if __name__ == "__main__":
    sys.exit(main())
