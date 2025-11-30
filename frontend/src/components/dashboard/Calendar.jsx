import React from "react";
import "./css/Calendar.css"; // <- make sure to create this file

const Calendar = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0 = Jan, 11 = Dec

  const monthName = today.toLocaleString("default", { month: "long" });

  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];

  // Empty cells before 1st date
  for (let i = 0; i < firstDayIndex; i++) {
    cells.push(<div key={`empty-${i}`} className="day-cell empty" />);
  }

  // Date cells
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(
      <div key={d} className="day-cell">
        {d}
      </div>
    );
  }

  return (
    <div className="calendar-wrapper">
      <div className="calendar-header">
        <h2>{monthName} {year}</h2>
      </div>

      <div className="week-row">
        <span>Sun</span>
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
      </div>

      <div className="calendar-grid">
        {cells}
      </div>
    </div>
  );
};

export default Calendar;
