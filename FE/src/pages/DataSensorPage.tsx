import { useCallback, useEffect, useState } from 'react';
import { DataTable } from '../components/DataTable';
import { PageHeader } from '../components/PageHeader';
import { searchDataSensor } from '../services/iotApi';
import { SensorRecord, SortDirection } from '../types/iot';

type DataSensorFindBy = 'nameSensor' | 'value' | 'dateTime';
type SensorUnit = '%' | 'degC' | 'lux';

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

const SENSOR_UNIT_OPTIONS: Array<{ value: SensorUnit; label: string }> = [
  { value: '%', label: '%' },
  { value: 'degC', label: '°C' },
  { value: 'lux', label: 'Lux' },
];

const PAGE_SIZE_OPTIONS = [5, 10, 15];

const UNIT_SENSOR_KEYWORDS: Record<SensorUnit, string[]> = {
  '%': ['humidity', 'do am', 'do_am', 'độ ẩm'],
  degC: ['temperature', 'nhiet', 'nhiet do', 'nhiệt độ'],
  lux: ['light', 'anh sang', 'anh_sang', 'ánh sáng'],
};

export function DataSensorPage() {
  const [rows, setRows] = useState<SensorRecord[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [query, setQuery] = useState('');
  const [findBy, setFindBy] = useState<DataSensorFindBy>('nameSensor');
  const [valueUnit, setValueUnit] = useState<SensorUnit>('%');
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
    unit: SensorUnit,
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
        body.nameSensor = UNIT_SENSOR_KEYWORDS[unit][0];
      }

      if (findByValue === 'dateTime') {
        body.dateTime = trimmedQuery;
      }

      let result = await searchDataSensor(body, {
        page: pageValue,
        size,
        sortBy: sortByValue,
        direction,
      });

      // Retry with additional sensor-name aliases so value + unit works across DB naming conventions.
      if (findByValue === 'value' && trimmedQuery && result.total === 0) {
        for (const keyword of UNIT_SENSOR_KEYWORDS[unit].slice(1)) {
          const retried = await searchDataSensor(
            { ...body, nameSensor: keyword },
            {
              page: pageValue,
              size,
              sortBy: sortByValue,
              direction,
            },
          );
          if (retried.total > 0) {
            result = retried;
            break;
          }
        }
      }

      setRows(result.rows);
      setTotalRows(result.total);
    } catch {
      setError('Không thể tải dữ liệu cảm biến. Vui lòng kiểm tra BE hoặc MQTT broker.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows('', 'dateTime', 'desc', 'nameSensor', valueUnit, 0, pageSize);
  }, [loadRows]);

  const handleSortChange = (nextOrder: SortDirection) => {
    setPage(0);
    setSortOrder(nextOrder);
    void loadRows(query, sortBy, nextOrder, findBy, valueUnit, 0, pageSize);
  };

  const handleSortByChange = (nextSortBy: string) => {
    const resolved = nextSortBy as DataSensorSortBy;
    setPage(0);
    setSortBy(resolved);
    void loadRows(query, resolved, sortOrder, findBy, valueUnit, 0, pageSize);
  };

  const handleFindByChange = (nextFindBy: string) => {
    const resolved = nextFindBy as DataSensorFindBy;
    setPage(0);
    setFindBy(resolved);
    void loadRows(query, sortBy, sortOrder, resolved, valueUnit, 0, pageSize);
  };

  const handleUnitChange = (nextUnit: string) => {
    const resolved = nextUnit as SensorUnit;
    setValueUnit(resolved);
    setPage(0);
    if (findBy === 'value') {
      void loadRows(query, sortBy, sortOrder, findBy, resolved, 0, pageSize);
    }
  };

  const handlePageSizeChange = (nextSize: number) => {
    const resolvedSize = Math.min(nextSize, 15);
    setPage(0);
    setPageSize(resolvedSize);
    void loadRows(query, sortBy, sortOrder, findBy, valueUnit, 0, resolvedSize);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    void loadRows(query, sortBy, sortOrder, findBy, valueUnit, nextPage, pageSize);
  };

  const handleSearch = () => {
    setPage(0);
    void loadRows(query, sortBy, sortOrder, findBy, valueUnit, 0, pageSize);
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
        searchAddon={
          findBy === 'value' ? (
            <label className="select-wrap">
              <select value={valueUnit} onChange={(event) => handleUnitChange(event.target.value)}>
                {SENSOR_UNIT_OPTIONS.map((unitOption) => (
                  <option key={unitOption.value} value={unitOption.value}>
                    {unitOption.label}
                  </option>
                ))}
              </select>
            </label>
          ) : undefined
        }
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
          { key: 'value', header: 'Value' },
          { key: 'time', header: 'Time' },
        ]}
      />
    </section>
  );
}