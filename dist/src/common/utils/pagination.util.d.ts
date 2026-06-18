export interface PaginationQuery {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface PaginatedResult<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}
export declare function paginate(query: PaginationQuery): {
    skip: number;
    take: number;
};
export declare function buildPaginatedResult<T>(data: T[], total: number, query: PaginationQuery): PaginatedResult<T>;
