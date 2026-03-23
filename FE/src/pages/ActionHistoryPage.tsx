import { useCallback, useEffect, useState } from 'react';
import { DataTable } from '../components/DataTable';
import { PageHeader } from '../components/PageHeader';
import { searchActionHistory } from '../services/iotApi';
import { ActionHistoryRecord, SortDirection } from '../types/iot';

type ActionHistoryFindBy = 'nameDevice' | 'action' | 'status' | 'dateTime';

const ACTION_HISTORY_FIND_BY_OPTIONS: Array<{ value: ActionHistoryFindBy; label: string }> = [
  { value: 'nameDevice', label: 'Device Name' },
  { value: 'action', label: 'Action' },
  { value: 'status', label: 'Status' },
  { value: 'dateTime', label: 'Date Time' },
];

type ActionHistorySortBy = 'id' | 'device.nameDevice' | 'action' | 'status' | 'dateTime';

const ACTION_HISTORY_SORT_BY_OPTIONS: Array<{ value: ActionHistorySortBy; label: string }> = [
  { value: 'id', label: 'ID' },
  { value: 'device.nameDevice', label: 'Device Name' },
  { value: 'action', label: 'Action' },
  { value: 'status', label: 'Status' },
  { value: 'dateTime', label: 'Time' },
];

const PAGE_SIZE_OPTIONS = [5, 10];

function toStatusClass(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes('success') || normalized.includes('ok') || normalized.includes('done')) {
    return 'chip chip--success';
  }
  if (normalized.includes('pending') || normalized.includes('wait')) {
    return 'chip chip--pending';
  }
  if (normalized.includes('fail') || normalized.includes('error')) {
    return 'chip chip--error';
  }
  return 'chip chip--neutral';
}

function toActionClass(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'on') {
    return 'chip chip--success';
  }
  if (normalized === 'off') {
    return 'chip chip--warning';
  }
  return 'chip chip--neutral';
}

function normalizeDateTimeQuery(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed.replace('T', ' ');
  }

  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed.replace('T', ' ')}:00`;
  }

  return null;
}

export function ActionHistoryPage() {
  const [rows, setRows] = useState<ActionHistoryRecord[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [query, setQuery] = useState('');
  const [findBy, setFindBy] = useState<ActionHistoryFindBy>('nameDevice');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<ActionHistorySortBy>('dateTime');
  const [sortOrder, setSortOrder] = useState<SortDirection>('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRows = useCallback(async (
    queryValue: string,
    sortByValue: ActionHistorySortBy,
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
            sortBy: sortByValue,
            direction,
          },
        );

        setRows(result.rows);
        setTotalRows(result.total);
        return;
      }

      const body: { nameDevice?: string; action?: string; status?: string; dateTime?: string } = {};

      if (findByValue === 'nameDevice') {
        body.nameDevice = trimmedQuery;
      }

      if (findByValue === 'action') {
        body.action = trimmedQuery.toLowerCase();
      }

      if (findByValue === 'status') {
        body.status = trimmedQuery;
      }

      if (findByValue === 'dateTime') {
        const normalizedDateTime = normalizeDateTimeQuery(trimmedQuery);
        if (!normalizedDateTime) {
          setRows([]);
          setTotalRows(0);
          setError('Vui lòng nhập thời gian dạng yyyy-MM-ddTHH:mm:ss hoặc yyyy-MM-dd HH:mm:ss');
          setLoading(false);
          return;
        }
        body.dateTime = normalizedDateTime;
      }

      const result = await searchActionHistory(
        body,
        {
          page: pageValue,
          size,
          sortBy: sortByValue,
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
    void loadRows('', 'dateTime', 'desc', 'nameDevice', 0, pageSize);
  }, [loadRows]);

  const handleSortChange = (nextOrder: SortDirection) => {
    setPage(0);
    setSortOrder(nextOrder);
    void loadRows(query, sortBy, nextOrder, findBy, 0, pageSize);
  };

  const handleSortByChange = (nextSortBy: string) => {
    const resolved = nextSortBy as ActionHistorySortBy;
    setPage(0);
    setSortBy(resolved);
    void loadRows(query, resolved, sortOrder, findBy, 0, pageSize);
  };

  const handleFindByChange = (nextFindBy: string) => {
    const resolved = nextFindBy as ActionHistoryFindBy;
    setPage(0);
    setFindBy(resolved);
    void loadRows(query, sortBy, sortOrder, resolved, 0, pageSize);
  };

  const handlePageSizeChange = (nextSize: number) => {
    const resolvedSize = Math.min(nextSize, 10);
    setPage(0);
    setPageSize(resolvedSize);
    void loadRows(query, sortBy, sortOrder, findBy, 0, resolvedSize);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    void loadRows(query, sortBy, sortOrder, findBy, nextPage, pageSize);
  };

  const handleSearch = () => {
    setPage(0);
    void loadRows(query, sortBy, sortOrder, findBy, 0, pageSize);
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
        queryInputType="text"
        queryPlaceholder={findBy === 'dateTime' ? 'YYYY-MM-DD HH:mm:ss' : 'Search'}
        sortBy={sortBy}
        sortByOptions={ACTION_HISTORY_SORT_BY_OPTIONS}
        onSortByChange={handleSortByChange}
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
          {
            key: 'action',
            header: 'Action',
            render: (value) => <span className={toActionClass(String(value))}>{String(value)}</span>,
          },
          {
            key: 'status',
            header: 'Status',
            render: (value) => <span className={toStatusClass(String(value))}>{String(value)}</span>,
          },
          { key: 'time', header: 'Time' },
        ]}
      />
    </section>
  );
}