export const sessionPayload = [{
  meeting_key: 1240,
  session_key: 9558,
  year: 2024,
  session_name: "Race",
  session_type: "Race",
  country_name: "Great Britain",
  circuit_short_name: "Silverstone",
  date_start: "2024-07-07T14:00:00+00:00",
  date_end: "2024-07-07T16:00:00+00:00",
}];

export const evidencePayloads = {
  laps: [{ driver_number: 44, lap_number: 38, lap_duration: 91.234, date_start: "2024-07-07T15:01:00+00:00" }],
  position: [{ driver_number: 44, position: 1, date: "2024-07-07T15:03:00+00:00" }],
  pit: [{ driver_number: 44, lap_number: 38, date: "2024-07-07T15:01:32+00:00", lane_duration: 28.4, stop_duration: null }],
  stints: [{ driver_number: 44, stint_number: 4, lap_start: 39, lap_end: 52, compound: "SOFT", tyre_age_at_start: 0 }],
  race_control: [{ category: "Flag", message: "CHEQUERED FLAG", date: "2024-07-07T15:22:27+00:00", driver_number: null, lap_number: 52, flag: "CHEQUERED" }],
  car_data: [{ driver_number: 44, date: "2024-07-07T15:03:00+00:00", speed: 296, rpm: 11200, n_gear: 8, throttle: 100, brake: 0, drs: 12 }],
} as const;
