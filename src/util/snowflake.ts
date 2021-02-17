import moment from 'moment';

export const getDateFromSnowflake = (
  id: string,
  ageSuffix = true
): [timestamp: string, age: string] => {
  const timestamp = parseInt(id.padStart(18, '0'), 10) / 4194304 + 1420070400000;

  const time = moment(timestamp);

  return [
    time.format('dddd, MMMM Do YYYY, h:mm:ss A [UTC]Z'),
    moment.duration(time.diff(moment.now())).humanize(ageSuffix),
  ];
};
