import { useCallback, useEffect, useState } from 'react';
import { DataTable } from '../components/DataTable';
import { PageHeader } from '../components/PageHeader';
import { searchActionHistory } from '../services/iotApi';
import { ActionHistoryRecord, SortDirection } from '../types/iot';

type ActionHistoryFindBy = 'nameDevice' | 'action' | 'status' | 'date';

const ACTION_HISTORY_FIND_BY_OPTIONS: Array<{ value: ActionHistoryFindBy; label: string }> = [
  { value: 'nameDevice', label: 'Device Name' },
  { value: 'action', label: 'Action' },
  { value: 'status', label: 'Status' },
  { value: 'date', label: 'Date' },
];

const PAGE_SIZE_OPTIONS = [5, 10, 15];

export function ActionHistoryPage() {
  const [rows, setRows] = useState<ActionHistoryRecord[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [query, setQuery] = useState('');
  const [findBy, setFindBy] = useState<ActionHistoryFindBy>('nameDevice');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortOrder, setSortOrder] = useState<SortDirection>('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRows = useCallback(async (
    queryValue: string,
    direction: SortDirection,
    findByValue: ActionHistoryFindBy,
    pageValue: number,
    size: number,
  ) => {
    setLoading(true);
    setError(null);

    try {
      const trimmedQuery = queryValue.trim();

      if (!trimmedQuery) {
        const result = await searchActionHistory(
          {},
          {
            page: pageValue,
            size,
            sortBy: 'dateTime',
            direction,
          },
        );

        setRows(result.rows);
        setTotalRows(result.total);
        return;
      }

      const body: { nameDevice?: string; action?: string; status?: string; date?: string } = {};

      if (findByValue === 'nameDevice') {
        body.nameDevice = trimmedQuery;
      }

      if (findByValue === 'action') {
        body.action = trimmedQuery.toLowerCase();
      }

      if (findByValue === 'status') {
        body.status = trimmedQuery;
      }

      if (findByValue === 'date') {
        body.date = trimmedQuery;
      }

      const result = await searchActionHistory(
        body,
        {
          page: pageValue,
          size,
          sortBy: 'dateTime',
          direction,
        },
      );

      setRows(result.rows);
      setTotalRows(result.total);
    } catch {
      setError('Không thể tải action history. Vui lòng kiểm tra BE hoặc MQTT broker.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows('', 'desc', 'nameDevice', 0, pageSize);
  }, [loadRows]);

  const handleSortChange = (nextOrder: SortDirection) => {
    setPage(0);
    setSortOrder(nextOrder);
    void loadRows(query, nextOrder, findBy, 0, pageSize);
  };

  const handleFindByChange = (nextFindBy: string) => {
    const resolved = nextFindBy as ActionHistoryFindBy;
    setPage(0);
    setFindBy(resolved);
    void loadRows(query, sortOrder, resolved, 0, pageSize);
  };

  const handlePageSizeChange = (nextSize: number) => {
    const resolvedSize = Math.min(nextSize, 15);
    setPage(0);
    setPageSize(resolvedSize);
    void loadRows(query, sortOrder, findBy, 0, resolvedSize);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    void loadRows(query, sortOrder, findBy, nextPage, pageSize);
  };

  const handleSearch = () => {
    setPage(0);
    void loadRows(query, sortOrder, findBy, 0, pageSize);
  };

  return (
    <section className="page page--table">
      <PageHeader title="Action History" subtitle="Theo dõi lịch sử bật tắt và trạng thái hiện tại của từng thiết bị." />
      <DataTable
        rows={rows}
        findBy={findBy}
        findByOptions={ACTION_HISTORY_FIND_BY_OPTIONS}
        onFindByChange={handleFindByChange}
        query={query}
        onQueryChange={setQuery}
        sortOrder={sortOrder}
        onSortOrderChange={handleSortChange}
        onSearch={handleSearch}
        page={page}
        onPageChange={handlePageChange}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageSizeChange={handlePageSizeChange}
        loading={loading}
        error={error}
        totalItems={totalRows}
        columns={[
          { key: 'id', header: 'ID' },
          { key: 'deviceName', header: 'Device Name' },
          { key: 'action', header: 'Action' },
          { key: 'status', header: 'Status' },
          { key: 'time', header: 'Time' },
        ]}
      />
    </section>
  );
}