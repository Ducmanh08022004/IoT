import { useEffect, useState } from 'react';
import { Filter, Search } from 'lucide-react';
import { CustomSelect } from './CustomSelect';

export function DataTable({
  columns,
  rows,
  query,
  queryInputType = 'text',
  queryPlaceholder = 'Search',
  queryStep,
  queryControl,
  filterControl,
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
}) {
  const hasRows = rows.length > 0;
  const total = totalItems ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);
  const [pageJump, setPageJump] = useState(String(safePage + 1));
  const fromItem = total === 0 ? 0 : safePage * pageSize + 1;
  const toItem = total === 0 ? 0 : Math.min((safePage + 1) * pageSize, total);
  const showFindBySelect = findByOptions.length > 1;

  useEffect(() => {
    setPageJump(String(safePage + 1));
  }, [safePage]);

  const jumpToPage = () => {
    const parsedPage = Number.parseInt(pageJump, 10);

    if (!Number.isFinite(parsedPage)) {
      setPageJump(String(safePage + 1));
      return;
    }

    const nextPage = Math.min(Math.max(parsedPage - 1, 0), totalPages - 1);
    setPageJump(String(nextPage + 1));
    onPageChange(nextPage);
  };

  return (
    <section className="panel table-panel">
      <div className="toolbar">
        <div className="toolbar__sort">
          <span>SORT BY:</span>
          <CustomSelect value={sortBy} options={sortByOptions} onChange={onSortByChange} ariaLabel="Sort by" />
          <button type="button" onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}>
            {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
          </button>
        </div>

        <div className="toolbar__search">
          {filterControl ? (
            <div className="toolbar__filter">
              <Filter size={16} />
              {filterControl}
            </div>
          ) : null}

          {showFindBySelect ? (
            <CustomSelect value={findBy} options={findByOptions} onChange={onFindByChange} ariaLabel="Find by" />
          ) : null}

          {queryControl ?? (
            <label className="input-wrap">
              <Search size={18} />
              <input
                type={queryInputType}
                step={queryStep}
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    onSearch();
                  }
                }}
                placeholder={queryPlaceholder}
              />
            </label>
          )}

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
        <span>Go to page:</span>
        <label className="input-wrap table-footer__page-input">
          <input
            type="number"
            min="1"
            max={totalPages}
            value={pageJump}
            onChange={(event) => setPageJump(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                jumpToPage();
              }
            }}
            aria-label="Go to page"
          />
        </label>
        <span>
          {fromItem}-{toItem} of {total}
        </span>
        <button type="button" className="toolbar__button" disabled={safePage === 0 || loading} onClick={() => onPageChange(safePage - 1)}>
          Prev
        </button>
        <span>
          Page {safePage + 1}/{totalPages}
        </span>
        <button type="button" className="toolbar__button" disabled={safePage >= totalPages - 1 || loading} onClick={() => onPageChange(safePage + 1)}>
          Next
        </button>
      </div>
    </section>
  );
}