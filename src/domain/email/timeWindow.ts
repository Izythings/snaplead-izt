export const getEmailTimeWindow = (date = new Date()) => {
  const day = date.getDay();
  return day >= 1 && day <= 3 ? "fin de semaine" : "début de semaine prochaine";
};
