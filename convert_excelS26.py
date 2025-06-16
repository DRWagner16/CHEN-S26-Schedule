# In convert_excel.py

import pandas as pd
import json
from datetime import datetime

def calculate_duration(time_str):
    """Calculates the duration of a class in minutes from a time string."""
    if pd.isna(time_str) or time_str == "TBA" or '-' not in str(time_str):
        return None
    try:
        time_str = str(time_str).replace("AM", " AM").replace("PM", " PM")
        start_time_str, end_time_str = time_str.split('-')
        time_format = "%I:%M %p"
        
        start_time = datetime.strptime(start_time_str.strip(), time_format)
        end_time = datetime.strptime(end_time_str.strip(), time_format)
        
        duration = (end_time - start_time).total_seconds() / 60
        return int(duration)
    except (ValueError, AttributeError):
        return None

def convert_to_json():
    """
    Reads the user-provided Excel schedule, processes the data,
    and saves it to schedule.json.
    """
    ########## THESE FILES ARE UPDATED FOR EVERY SEMESTER ##########
    input_excel_file = 'Spring2026_Schedule.xlsx'
    output_json_file = 'S26schedule.json'

    try:
        print(f"[INFO] Reading data from '{input_excel_file}'...")
        df = pd.read_excel(input_excel_file)
        
        # --- CHANGE #1: The line combining COURSE and SECTION is removed ---
        # The 'COURSE' column is now used directly as the course_number.
        print("[INFO] Setting course number...")
        df['course_number'] = df['COURSE'].astype(str)

        print("[INFO] Calculating class durations...")
        df['duration'] = df['TIME'].apply(calculate_duration)
        
        # Map your column names to the JSON keys the calendar expects
        df = df.rename(columns={
            'INSTRUCTOR': 'instructors',
            'DAYS': 'days',
            'TIME': 'time_of_day',
            'LOCATION': 'location',
            'TYPE': 'type'
        })
        
        # Select only the columns we need for the final JSON
        final_columns = ['course_number', 'instructors', 'days', 'time_of_day', 'duration', 'location', 'type']
        df_final = df[final_columns]
        
        schedule_data = df_final.to_dict(orient='records')
        
        with open(output_json_file, 'w') as f:
            json.dump(schedule_data, f, indent=4)
            
        print(f"\n[SUCCESS] Conversion complete! Data saved to '{output_json_file}'.")

    except FileNotFoundError:
        print(f"[FATAL] Error: The file '{input_excel_file}' was not found.")
    except KeyError as e:
        # --- CHANGE #2: The error message is updated to remove 'SECTION' ---
        print(f"[FATAL] A required column was not found in the Excel file: {e}")
        print("[INFO] Please ensure your column headers include: COURSE, INSTRUCTOR, DAYS, TIME, LOCATION, TYPE")
    except Exception as e:
        print(f"[FATAL] An unexpected error occurred: {e}")


if __name__ == "__main__":
    convert_to_json()