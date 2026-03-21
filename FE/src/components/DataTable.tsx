import { Search } from 'lucide-react';
import { CustomSelect } from './CustomSelect';

type Column<T> = {
  key: keyof T;
  header: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
};

type FindByOption = {
  value: string;
  label: string;
};

type DataTableProps<T extends { id: number }> = {
  columns: Column<T>[];
  rows: T[];
  query: string;
  findBy: string;
  findByOptions: FindByOption[];
  onFindByChange: (value: string) => void;
  onQueryChange: (query: string) => void;
  searchAddon?: React.ReactNode;
  sortBy: string;
  sortByOptions: FindByOption[];
  onSortByChange: (value: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  onSearch: () => void;
  page: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageSizeChange: (size: number) => void;
  loading?: boolean;
  error?: string | null;
  totalItems?: number;
};

export function DataTable<T extends { id: number }>({
  columns,
  rows,
  query,
  findBy,
  findByOptions,
  onFindByChange,
  onQueryChange,
  searchAddon,
  sortBy,
  sortByOptions,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  onSearch,
  page,
  onPageChange,
  pageSize,
  pageSizeOptions = [5, 10],
  onPageSizeChange,
  loading = false,
  error = null,
  totalItems,
}: DataTableProps<T>) {
  const hasRows = rows.length > 0;
  const total = totalItems ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);
  const fromItem = total === 0 ? 0 : safePage * pageSize + 1;
  const toItem = total === 0 ? 0 : Math.min((safePage + 1) * pageSize, total);

  return (
    <section className="panel table-panel">
      <div className="toolbar">
        <div className="toolbar__sort">
          <span>SORT BY:</span>
          <CustomSelect
            value={sortBy}
            options={sortByOptions}
            onChange={onSortByChange}
            ariaLabel="Sort by"
          />
          <button
            type="button"
            onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
          </button>
        </div>

        <div className="toolbar__search">
          <CustomSelect
            value={findBy}
            options={findByOptions}
            onChange={onFindByChange}
            ariaLabel="Find by"
          />

          <label className="input-wrap">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  onSearch();
                }
              }}
              placeholder="Search"
            />
          </label>

          {searchAddon}

          <button type="button" className="toolbar__button" onClick={onSearch}>
            Search
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={String(column.key)}>{column.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="table-state-cell">
                  Loading...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={columns.length} className="table-state-cell table-state-cell--error">
                  {error}
                </td>
              </tr>
            ) : !hasRows ? (
              <tr>
                <td colSpan={columns.length} className="table-state-cell">
                  No data found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  {columns.map((column) => {
                    const value = row[column.key];
                    return (
                      <td key={String(column.key)}>
                        {column.render ? column.render(value, row) : String(value)}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <span>Rows per page:</span>
        <CustomSelect
          value={pageSize}
          options={pageSizeOptions.map((size) => ({ value: size, label: String(size) }))}
          onChange={onPageSizeChange}
          ariaLabel="Rows per page"
        />
        <span>
          {fromItem}-{toItem} of {total}
        </span>
        <button
          type="button"
          className="toolbar__button"
          disabled={safePage === 0 || loading}
          onClick={() => onPageChange(safePage - 1)}
        >
          Prev
        </button>
        <span>
          Page {safePage + 1}/{totalPages}
        </span>
        <button
          type="button"
          className="toolbar__button"
          disabled={safePage >= totalPages - 1 || loading}
          onClick={() => onPageChange(safePage + 1)}
        >
          Next
        </button>
      </div>
    </section>
  );
}