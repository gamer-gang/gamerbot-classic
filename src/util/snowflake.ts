import moment from 'moment';

export const getDateFromSnowflake = (
  id: string,
  ageSuffix = true
): [timestamp: string, age: string] => {
  const timestamp = parseInt(id, 10) / 4194304 + 1420070400000;

  return [
    moment(timestamp).format('dddd, MMMM Do YYYY, h:mm:ss A'),
    moment.duration(moment(timestamp).diff(moment.now())).humanize(ageSuffix),
  ];
};
