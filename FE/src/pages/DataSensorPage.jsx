import { useCallback, useEffect, useState } from 'react';
import { CustomSelect } from '../components/CustomSelect';
import { DataTable } from '../components/DataTable';
import { PageHeader } from '../components/PageHeader';
import { searchDataSensor } from '../services/iotApi';

const DATA_SENSOR_FIND_BY_OPTIONS = [
  { value: 'value', label: 'Value' },
  { value: 'dateTime', label: 'Date' },
];

const DATA_SENSOR_SORT_BY_OPTIONS = [
  { value: 'id', label: 'ID' },
  { value: 'sensor.nameSensor', label: 'Sensor Name' },
  { value: 'value', label: 'Value' },
  { value: 'dateTime', label: 'Time' },
];

const PAGE_SIZE_OPTIONS = [5, 10];

const SENSOR_NAME_FILTER_OPTIONS = [
  { value: '', label: 'All Sensors' },
  { value: 'temperature', label: 'Temperature' },
  { value: 'wind speed', label: 'Windspeed' },
  { value: 'humidity', label: 'Humidity' },
  { value: 'light', label: 'Light' },
];

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

function toSensorValueClass(sensorName, value) {
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

  if (sensor.includes('wind') || sensor.includes('gio') || sensor.includes('gió')) {
    if (numeric >= 60) {
      return 'chip chip--error';
    }
    if (numeric >= 40) {
      return 'chip chip--warning';
    }
    return 'chip chip--success';
  }

  return 'chip chip--neutral';
}

export function DataSensorPage() {
  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [query, setQuery] = useState('');
  const [findBy, setFindBy] = useState('dateTime');
  const [sensorNameFilter, setSensorNameFilter] = useState('');
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
    findByValue,
    sensorNameValue,
    pageValue,
    size,
  ) => {
    setLoading(true);
    setError(null);

    try {
      const trimmedQuery = queryValue.trim();
      const hasSensorFilter = Boolean(sensorNameValue);

      if (!trimmedQuery && !hasSensorFilter) {
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

      const body = {};

      if (hasSensorFilter) {
        body.nameSensor = sensorNameValue;
      }

      if (findByValue === 'value' && trimmedQuery) {
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

      if (findByValue === 'dateTime' && trimmedQuery) {
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
    void loadRows('', 'dateTime', 'desc', findBy, sensorNameFilter, 0, pageSize);
  }, [loadRows, findBy, sensorNameFilter, pageSize]);

  const handleSortChange = (nextOrder) => {
    setPage(0);
    setSortOrder(nextOrder);
    void loadRows(query, sortBy, nextOrder, findBy, sensorNameFilter, 0, pageSize);
  };

  const handleSortByChange = (nextSortBy) => {
    setPage(0);
    setSortBy(nextSortBy);
    void loadRows(query, nextSortBy, sortOrder, findBy, sensorNameFilter, 0, pageSize);
  };

  const handleFindByChange = (nextFindBy) => {
    setPage(0);
    setFindBy(nextFindBy);
    setQuery('');
    void loadRows('', sortBy, sortOrder, nextFindBy, sensorNameFilter, 0, pageSize);
  };

  const handleSensorNameFilterChange = (nextSensorName) => {
    setSensorNameFilter(nextSensorName);
    setPage(0);
    void loadRows(query, sortBy, sortOrder, findBy, nextSensorName, 0, pageSize);
  };

  const handlePageSizeChange = (nextSize) => {
    const resolvedSize = Math.min(nextSize, 10);
    setPage(0);
    setPageSize(resolvedSize);
    void loadRows(query, sortBy, sortOrder, findBy, sensorNameFilter, 0, resolvedSize);
  };

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
    void loadRows(query, sortBy, sortOrder, findBy, sensorNameFilter, nextPage, pageSize);
  };

  const handleSearch = () => {
    setPage(0);
    void loadRows(query, sortBy, sortOrder, findBy, sensorNameFilter, 0, pageSize);
  };

  return (
    <section className="page page--table">
      <PageHeader title="Data Sensor" subtitle="Lịch sử dữ liệu thu thập từ các cảm biến" />
      <DataTable
        rows={rows}
        findBy={findBy}
        findByOptions={DATA_SENSOR_FIND_BY_OPTIONS}
        onFindByChange={handleFindByChange}
        filterControl={(
          <CustomSelect
            value={sensorNameFilter}
            options={SENSOR_NAME_FILTER_OPTIONS}
            onChange={handleSensorNameFilterChange}
            ariaLabel="Sensor name filter"
          />
        )}
        query={query}
        onQueryChange={setQuery}
        queryInputType={findBy === 'value' ? 'number' : 'text'}
        queryStep={findBy === 'value' ? '0.1' : undefined}
        queryPlaceholder={findBy === 'dateTime' ? 'YYYY-MM-DD HH:mm:ss' : findBy === 'value' ? 'Exact numeric value' : 'Search'}
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