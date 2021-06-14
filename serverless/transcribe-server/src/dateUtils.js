module.exports ={
    isTime1GreaterThan : (time1, time2) => {
        var date1 = new Date("2021-01-01T" + time1);
        var date2 = new Date("2021-01-01T" + time2);
        return date1.getTime() > date2.getTime();
    },
    getTimeHHMMSSFormat : (time) => new Date(1000 * time).toISOString().substr(11, 12)
};