INSERT INTO device (name_device, date_time)
SELECT 'air_condition', CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1
  FROM device
  WHERE name_device = 'air_condition'
);

INSERT INTO device (name_device, date_time)
SELECT 'light_bulb', CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1
  FROM device
  WHERE name_device = 'light_bulb'
);

INSERT INTO device (name_device, date_time)
SELECT 'fan', CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1
  FROM device
  WHERE name_device = 'fan'
);

INSERT INTO sensor (id, name_sensor, create_at)
SELECT 1, 'Temperature', CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1
  FROM sensor
  WHERE id = 1 OR name_sensor = 'Temperature'
);

INSERT INTO sensor (id, name_sensor, create_at)
SELECT 2, 'Humidity', CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1
  FROM sensor
  WHERE id = 2 OR name_sensor = 'Humidity'
);

INSERT INTO sensor (id, name_sensor, create_at)
SELECT 3, 'Light', CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1
  FROM sensor
  WHERE id = 3 OR name_sensor = 'Light'
);