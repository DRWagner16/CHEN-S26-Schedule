// In script.js

document.addEventListener('DOMContentLoaded', () => {
    const calendarGrid = document.querySelector('.calendar-grid');
    const timeColumn = document.querySelector('.time-column');
    const instructorFilter = document.getElementById('instructor-filter');
    const typeFilter = document.getElementById('type-filter');
    const courseCheckboxesContainer = document.getElementById('course-checkboxes');
    const resetBtn = document.getElementById('reset-filters');

    const START_HOUR = 7;
    const END_HOUR = 20;
    const dayMap = { 'M': 'Mo', 'T': 'Tu', 'W': 'We', 'R': 'Th', 'F': 'Fr' };
    let allCourses = [];
    const courseColorMap = new Map();

    generateTimeSlots();
    fetchDataAndInitialize();

    instructorFilter.addEventListener('change', filterAndRedrawCalendar);
    typeFilter.addEventListener('change', filterAndRedrawCalendar);
    courseCheckboxesContainer.addEventListener('change', filterAndRedrawCalendar);
    resetBtn.addEventListener('click', () => {
        instructorFilter.value = 'all';
        typeFilter.value = 'all';
        document.querySelectorAll('#course-checkboxes input[type="checkbox"]').forEach(cb => cb.checked = false);
        filterAndRedrawCalendar();
    });

    function stringToHslColor(str, s = 60, l = 75) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h = hash % 360;
        return `hsl(${h}, ${s}%, ${l}%)`;
    }

    function generateTimeSlots() {
        for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
            const timeSlot = document.createElement('div');
            timeSlot.classList.add('time-slot');
            timeSlot.innerText = `${hour}:00`;
            timeColumn.appendChild(timeSlot);
        }
    }

    function fetchDataAndInitialize() {
        fetch('S25schedule.json')
            .then(response => response.json())
            .then(data => {
                allCourses = data.map(course => {
                    const timeString = course.time_of_day;
                    const timeParts = timeString.match(/(\d{1,2}:\d{2})(AM|PM)/);
                    if (!timeParts) return { ...course, startMinutes: null, endMinutes: null };
                    
                    const [time, ampm] = [timeParts[1], timeParts[2]];
                    let [hour, minute] = time.split(':').map(Number);

                    if (ampm === 'PM' && hour !== 12) hour += 12;
                    if (ampm === 'AM' && hour === 12) hour = 0;
                    
                    const startMinutes = (hour * 60) + minute;
                    const endMinutes = startMinutes + course.duration;
                    
                    return { ...course, startMinutes, endMinutes };
                });
                
                populateFilters(allCourses);
                filterAndRedrawCalendar();
            })
            .catch(error => console.error('[FATAL] Error loading schedule data:', error));
    }
    
    function populateFilters(courses) {
        const uniqueCourses = [...new Set(courses.map(course => course.course_number))].sort();
        uniqueCourses.forEach(courseName => {
            courseColorMap.set(courseName, stringToHslColor(courseName));
        });
        const allInstructorNames = courses.flatMap(course => course.instructors.split(';').map(name => name.trim()));
        const uniqueInstructors = [...new Set(allInstructorNames)].sort();
        uniqueInstructors.forEach(name => {
            if (name && name.toLowerCase() !== 'nan') {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                instructorFilter.appendChild(option);
            }
        });
        const uniqueTypes = [...new Set(courses.map(course => course.type))].sort();
        uniqueTypes.forEach(typeName => {
            if (typeName && typeName.toLowerCase() !== 'nan') {
                const option = document.createElement('option');
                option.value = typeName;
                option.textContent = typeName;
                typeFilter.appendChild(option);
            }
        });
        uniqueCourses.forEach(courseName => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'checkbox-item';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = courseName;
            checkbox.value = courseName;
            const label = document.createElement('label');
label.htmlFor = courseName;
            label.textContent = courseName;
            itemDiv.appendChild(checkbox);
            itemDiv.appendChild(label);
            courseCheckboxesContainer.appendChild(itemDiv);
        });
    }

    function filterAndRedrawCalendar() {
        document.querySelectorAll('.class-event').forEach(event => event.remove());

        const selectedInstructor = instructorFilter.value;
        const selectedType = typeFilter.value;
        const selectedCourses = Array.from(document.querySelectorAll('#course-checkboxes input:checked')).map(cb => cb.value);

        const filteredCourses = allCourses.filter(course => {
            const instructorMatch = (selectedInstructor === 'all' || course.instructors.includes(selectedInstructor));
            const typeMatch = (selectedType === 'all' || course.type === selectedType);
            const courseMatch = (selectedCourses.length === 0 || selectedCourses.includes(course.course_number));
            return instructorMatch && typeMatch && courseMatch;
        });

        Object.values(dayMap).forEach(dayCode => {
            const dayEvents = filteredCourses
                .filter(course => course.days.includes(Object.keys(dayMap).find(key => dayMap[key] === dayCode)))
                .sort((a, b) => a.startMinutes - b.startMinutes);
            if (dayEvents.length === 0) return;
            let columns = [];
            dayEvents.forEach(event => {
                let placed = false;
                for (const column of columns) {
                    const lastEventInColumn = column[column.length - 1];
                    if (event.startMinutes >= lastEventInColumn.endMinutes) {
                        column.push(event);
                        placed = true;
                        break;
                    }
                }
                if (!placed) {
                    columns.push([event]);
                }
            });
            const totalColumns = columns.length;
            columns.forEach((column, columnIndex) => {
                column.forEach(event => {
                    const width = 100 / totalColumns;
                    const left = columnIndex * width;
                    placeCourseOnCalendar(event, dayCode, width, left);
                });
            });
        });
    }
    
    function placeCourseOnCalendar(course, day, width = 100, left = 0) {
        // --- THIS IS THE ONLY LINE CHANGED IN THIS SCRIPT ---
        // We now look for the new .day-content container to place the event
        const column = document.querySelector(`.day-content[data-day="${day}"]`);
        if (!column) return;
        
        const minutesSinceCalendarStart = course.startMinutes - (START_HOUR * 60);
        const topPosition = minutesSinceCalendarStart;
        const height = course.duration;
        if (!height || topPosition < 0) return;
        
        const eventDiv = document.createElement('div');
        eventDiv.className = 'class-event';
        
        eventDiv.style.top = `${topPosition}px`;
        eventDiv.style.height = `${height}px`;
        eventDiv.style.width = `calc(${width}% - 4px)`;
        eventDiv.style.left = `${left}%`;
        
        const color = courseColorMap.get(course.course_number) || '#a3c4f3';
        eventDiv.style.backgroundColor = color;
        eventDiv.style.borderColor = `hsl(${parseInt(color.substring(4))}, 50%, 60%)`;

        eventDiv.innerHTML = `
            <div class="event-title">${course.course_number}</div>
            <div class="event-tooltip">
                <strong>Course:</strong> ${course.course_number}<br>
                <strong>Instructor:</strong> ${course.instructors}<br>
                <strong>Time:</strong> ${course.time_of_day}<br>
                <strong>Location:</strong> ${course.location}<br>
                <strong>Type:</strong> ${course.type}<br>
                <strong>Duration:</strong> ${course.duration} min
            </div>`;
            
        column.appendChild(eventDiv);
    }
});
