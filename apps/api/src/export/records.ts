import type PocketBase from "pocketbase";

export type ExportOptions = {
  collection: string;
  expand?: string;
  fields?: string;
  filter?: string;
  perPage: number;
  sort?: string;
};

export async function getAllRecords(pb: PocketBase, options: ExportOptions): Promise<Record<string, unknown>[]> {
  const records: Record<string, unknown>[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const result = await pb.collection(options.collection).getList(page, options.perPage, {
      expand: options.expand || undefined,
      fields: options.fields || undefined,
      filter: options.filter || undefined,
      sort: options.sort || undefined
    });

    records.push(...(result.items as unknown as Record<string, unknown>[]));
    totalPages = result.totalPages;
    page += 1;
  } while (page <= totalPages);

  return records;
}
