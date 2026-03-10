import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Series = {
  key: string;
  name: string;
  color: string;
};

type ChartCardProps<T extends Record<string, string | number>> = {
  title: string;
  data: T[];
  series: Series[];
};

export function ChartCard<T extends Record<string, string | number>>({
  title,
  data,
  series,
}: ChartCardProps<T>) {
  return (
    <article className="panel chart-card">
      <div className="chart-card__header">
        <h2>{title}</h2>
      </div>
      <div className="chart-card__body">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 16, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid stroke="rgba(25, 51, 85, 0.08)" vertical={false} />
            <XAxis dataKey="time" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis tickLine={false} axisLine={false} fontSize={11} />
            <Tooltip />
            <Legend verticalAlign="top" height={36} />
            {series.map((item) => (
              <Line
                key={item.key}
                type="monotone"
                dataKey={item.key}
                stroke={item.color}
                name={item.name}
                strokeWidth={2.4}
                dot={{ r: 0 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}