import { useCallback, useEffect, useState } from 'react';
import { CustomSelect } from '../components/CustomSelect';
import { DataTable } from '../components/DataTable';
import { PageHeader } from '../components/PageHeader';
import { searchActionHistory } from '../services/iotApi';

const ACTION_HISTORY_FIND_BY_OPTIONS = [
  { value: 'dateTime', label: 'Date Time' },
];

const DEVICE_FILTER_OPTIONS = [
  { value: '', label: 'All Devices' },
  { value: 'warning_light', label: 'warning_light' },
  { value: 'fan', label: 'fan' },
  { value: 'light_bulb', label: 'light_bulb' },
  { value: 'air_condition', label: 'air_condition' },
];

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'on', label: 'TURN_ON' },
  { value: 'off', label: 'TURN_OFF' },
  { value: 'warning', label: 'WARNING' },
];

const ACTION_FILTER_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
  { value: 'warning', label: 'Warning' },
];

const ACTION_HISTORY_SORT_BY_OPTIONS = [
  { value: 'dateTime', label: 'Time' },
  { value: 'id', label: 'ID' },
  { value: 'device.nameDevice', label: 'Device Name' },
  { value: 'action', label: 'Action' },
  { value: 'status', label: 'Status' },
];

const PAGE_SIZE_OPTIONS = [5, 10];

function toStatusClass(value) {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes('success') || normalized.includes('ok') || normalized.includes('done')) {
    return 'chip chip--success';
  }
  if (normalized.includes('pending') || normalized.includes('wait')) {
    return 'chip chip--pending';
  }
  if (normalized.includes('warning')) {
    return 'chip chip--warning';
  }
  if (normalized.includes('fail') || normalized.includes('error')) {
    return 'chip chip--error';
  }
  return 'chip chip--neutral';
}

function toActionClass(value) {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'on') {
    return 'chip chip--success';
  }
  if (normalized === 'off') {
    return 'chip chip--warning';
  }
  if (normalized === 'warning') {
    return 'chip chip--warning';
  }
  return 'chip chip--neutral';
}

function normalizeDateTimeQuery(value) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed.replace('T', ' ');
  }

  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed.replace('T', ' ');
  }

  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}$/.test(trimmed)) {
    return trimmed.replace('T', ' ');
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function ActionHistoryPage() {
  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [query, setQuery] = useState('');
  const [deviceNameFilter, setDeviceNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState('dateTime');
  const [sortOrder, setSortOrder] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadRows = useCallback(async (
    queryValue,
    sortByValue,
    direction,
    deviceNameValue,
    statusValue,
    actionValue,
    pageValue,
    size,
  ) => {
    setLoading(true);
    setError(null);

    try {
      const trimmedQuery = queryValue.trim();
      const hasAnyFilter = Boolean(deviceNameValue || statusValue || actionValue);

      if (!trimmedQuery && !hasAnyFilter) {
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

      const body = {};

      if (deviceNameValue) {
        body.nameDevice = deviceNameValue;
      }

      if (statusValue) {
        body.action = statusValue;
      }

      if (actionValue) {
        body.status = actionValue;
      }

      if (trimmedQuery) {
        const normalizedDateTime = normalizeDateTimeQuery(trimmedQuery);
        if (!normalizedDateTime) {
          setRows([]);
          setTotalRows(0);
          setError('Vui lòng nhập thời gian dạng yyyy-MM-dd HH[:mm[:ss]]');
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
    void loadRows('', 'dateTime', 'desc', deviceNameFilter, statusFilter, actionFilter, 0, pageSize);
  }, [loadRows, deviceNameFilter, statusFilter, actionFilter, pageSize]);

  const handleSortChange = (nextOrder) => {
    setPage(0);
    setSortOrder(nextOrder);
    void loadRows(query, sortBy, nextOrder, deviceNameFilter, statusFilter, actionFilter, 0, pageSize);
  };

  const handleSortByChange = (nextSortBy) => {
    setPage(0);
    setSortBy(nextSortBy);
    void loadRows(query, nextSortBy, sortOrder, deviceNameFilter, statusFilter, actionFilter, 0, pageSize);
  };

  const handleDeviceNameFilterChange = (nextValue) => {
    setPage(0);
    setDeviceNameFilter(nextValue);
    void loadRows(query, sortBy, sortOrder, nextValue, statusFilter, actionFilter, 0, pageSize);
  };

  const handleStatusFilterChange = (nextValue) => {
    setPage(0);
    setStatusFilter(nextValue);
    void loadRows(query, sortBy, sortOrder, deviceNameFilter, nextValue, actionFilter, 0, pageSize);
  };

  const handleActionFilterChange = (nextValue) => {
    setPage(0);
    setActionFilter(nextValue);
    void loadRows(query, sortBy, sortOrder, deviceNameFilter, statusFilter, nextValue, 0, pageSize);
  };

  const handlePageSizeChange = (nextSize) => {
    const resolvedSize = Math.min(nextSize, 10);
    setPage(0);
    setPageSize(resolvedSize);
    void loadRows(query, sortBy, sortOrder, deviceNameFilter, statusFilter, actionFilter, 0, resolvedSize);
  };

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
    void loadRows(query, sortBy, sortOrder, deviceNameFilter, statusFilter, actionFilter, nextPage, pageSize);
  };

  const handleSearch = () => {
    setPage(0);
    void loadRows(query, sortBy, sortOrder, deviceNameFilter, statusFilter, actionFilter, 0, pageSize);
  };

  return (
    <section className="page page--table">
      <PageHeader title="Action History" subtitle="Theo dõi lịch sử bật tắt và trạng thái hiện tại của từng thiết bị." />
      <DataTable
        rows={rows}
        findBy="dateTime"
        findByOptions={ACTION_HISTORY_FIND_BY_OPTIONS}
        onFindByChange={() => undefined}
        filterControl={(
          <div className="toolbar__filter-fields">
            <div className="toolbar__filter-field">
              <CustomSelect
                value={deviceNameFilter}
                options={DEVICE_FILTER_OPTIONS}
                onChange={handleDeviceNameFilterChange}
                ariaLabel="Device name filter"
              />
            </div>
            <div className="toolbar__filter-field">
              <CustomSelect
                value={statusFilter}
                options={STATUS_FILTER_OPTIONS}
                onChange={handleStatusFilterChange}
                ariaLabel="Status filter"
              />
            </div>
            <div className="toolbar__filter-field">
              <CustomSelect
                value={actionFilter}
                options={ACTION_FILTER_OPTIONS}
                onChange={handleActionFilterChange}
                ariaLabel="Action filter"
              />
            </div>
          </div>
        )}
        query={query}
        onQueryChange={setQuery}
        queryInputType="text"
        queryPlaceholder="YYYY-MM-DD HH:mm:ss"
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