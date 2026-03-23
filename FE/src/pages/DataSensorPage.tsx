import { useCallback, useEffect, useState } from 'react';
import { DataTable } from '../components/DataTable';
import { PageHeader } from '../components/PageHeader';
import { searchDataSensor } from '../services/iotApi';
import { SensorRecord, SortDirection } from '../types/iot';

type DataSensorFindBy = 'nameSensor' | 'value' | 'dateTime';

const DATA_SENSOR_FIND_BY_OPTIONS: Array<{ value: DataSensorFindBy; label: string }> = [
  { value: 'nameSensor', label: 'Sensor Name' },
  { value: 'value', label: 'Value' },
  { value: 'dateTime', label: 'Date' },
];

type DataSensorSortBy = 'id' | 'sensor.nameSensor' | 'value' | 'dateTime';

const DATA_SENSOR_SORT_BY_OPTIONS: Array<{ value: DataSensorSortBy; label: string }> = [
  { value: 'id', label: 'ID' },
  { value: 'sensor.nameSensor', label: 'Sensor Name' },
  { value: 'value', label: 'Value' },
  { value: 'dateTime', label: 'Time' },
];

const PAGE_SIZE_OPTIONS = [5, 10];

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

function toSensorValueClass(sensorName: string, value: string): string {
  const sensor = sensorName.trim().toLowerCase();
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 'chip chip--neutral';
  }

  if (sensor.includes('temp') || sensor.includes('nhiet') || sensor.includes('nhiệt')) {
    if (numeric >= 35) {
      return 'chip chip--error';
    }
    if (numeric >= 30) {
      return 'chip chip--warning';
    }
    return 'chip chip--success';
  }

  if (sensor.includes('humid') || sensor.includes('am') || sensor.includes('ẩm')) {
    if (numeric < 30 || numeric > 75) {
      return 'chip chip--warning';
    }
    return 'chip chip--success';
  }

  if (sensor.includes('light') || sensor.includes('sang') || sensor.includes('sáng')) {
    if (numeric < 120) {
      return 'chip chip--warning';
    }
    if (numeric > 800) {
      return 'chip chip--accent';
    }
    return 'chip chip--success';
  }

  return 'chip chip--neutral';
}

export function DataSensorPage() {
  const [rows, setRows] = useState<SensorRecord[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [query, setQuery] = useState('');
  const [findBy, setFindBy] = useState<DataSensorFindBy>('nameSensor');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<DataSensorSortBy>('dateTime');
  const [sortOrder, setSortOrder] = useState<SortDirection>('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRows = useCallback(async (
    queryValue: string,
    sortByValue: DataSensorSortBy,
    direction: SortDirection,
    findByValue: DataSensorFindBy,
    pageValue: number,
    size: number,
  ) => {
    setLoading(true);
    setError(null);

    try {
      const trimmedQuery = queryValue.trim();

      if (!trimmedQuery) {
        const result = await searchDataSensor(
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

      const body: { nameSensor?: string; value?: number; dateTime?: string } = {};

      if (findByValue === 'nameSensor') {
        body.nameSensor = trimmedQuery;
      }

      if (findByValue === 'value') {
        const numeric = Number(trimmedQuery);
        if (!Number.isFinite(numeric)) {
          setRows([]);
          setTotalRows(0);
          setError('Value phải là số hợp lệ.');
          setLoading(false);
          return;
        }
        body.value = numeric;
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

      const result = await searchDataSensor(body, {
        page: pageValue,
        size,
        sortBy: sortByValue,
        direction,
      });

      setRows(result.rows);
      setTotalRows(result.total);
    } catch {
      setError('Không thể tải dữ liệu cảm biến. Vui lòng kiểm tra BE hoặc MQTT broker.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows('', 'dateTime', 'desc', 'nameSensor', 0, pageSize);
  }, [loadRows]);

  const handleSortChange = (nextOrder: SortDirection) => {
    setPage(0);
    setSortOrder(nextOrder);
    void loadRows(query, sortBy, nextOrder, findBy, 0, pageSize);
  };

  const handleSortByChange = (nextSortBy: string) => {
    const resolved = nextSortBy as DataSensorSortBy;
    setPage(0);
    setSortBy(resolved);
    void loadRows(query, resolved, sortOrder, findBy, 0, pageSize);
  };

  const handleFindByChange = (nextFindBy: string) => {
    const resolved = nextFindBy as DataSensorFindBy;
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
      <PageHeader title="Data Sensor" subtitle="Lịch sử dữ liệu thu thập từ các cảm biến" />
      <DataTable
        rows={rows}
        findBy={findBy}
        findByOptions={DATA_SENSOR_FIND_BY_OPTIONS}
        onFindByChange={handleFindByChange}
        query={query}
        onQueryChange={setQuery}
        queryInputType="text"
        queryPlaceholder={findBy === 'dateTime' ? 'YYYY-MM-DD HH:mm:ss' : 'Search'}
        sortBy={sortBy}
        sortByOptions={DATA_SENSOR_SORT_BY_OPTIONS}
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
          { key: 'sensorName', header: 'Sensor Name' },
          {
            key: 'value',
            header: 'Value',
            render: (value, row) => (
              <span className={toSensorValueClass(String(row.sensorName), String(value))}>
                {String(value)}
              </span>
            ),
          },
          { key: 'time', header: 'Time' },
        ]}
      />
    </section>
  );
}