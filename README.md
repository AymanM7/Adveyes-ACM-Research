

![Screenshot_25-11-2025_22249_github com](https://github.com/user-attachments/assets/eaec2ef0-7c22-4fc5-9d02-0224600fb150)






# ADVEYES


Prep:

Remove the venv folder
cd eye_tracking
python -m venv venv

Here your vitual environment should be activated
if not run ./venv/Scripts/activate

run pip install opencv-python numpy mediapipe scipy pyautogui keyboard
should take a couple minutes

once finished go to the following files and change the file paths to where your own are located:
- api\eye_tracking\start\route.js line 5
- eye_tracking\MonitorTracking.py line 85 and line 90

Running Experiment:
cd adveyes
python eye_tracking/MonitorTracking.py

// OPEN A NEW TERMINAL
npm run dev

At this point, a new window should pop up showing live eyetracking

Before starting the cpt card test, open the live eye tracking window
Prompt the user to look at the center of the screen, and while looking press C. This should calibrate the eye tracker
Then return to the testing site and press "start" to actualy begin.
When all 3 cpt card trials are done, go back to the eye tracking window and press Q to end the eye tracking session.


PYTHON EYE:
python .\eye_tracking\MonitorTracking.py
