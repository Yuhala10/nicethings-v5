"use client";

import { use } from "react";
import PostEditor, { type PostRow } from "@/components/admin/blog/PostEditor";
import { Skeleton, useAdminData } from "@/components/admin/ui";

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data, error } = useAdminData<{ row: PostRow }>(`posts/${id}`);

    if (error) return <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-bad">{error}</p>;
    if (!data) {
        return (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <Skeleton className="h-[32rem]" />
                <Skeleton className="h-[32rem]" />
            </div>
        );
    }
    return <PostEditor key={data.row.id} initial={data.row} />;
}
