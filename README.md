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
npm run dev

When starting the cpt card test, press start, wait for camera to load.
A new window should pop up with live eye tracking.
Prompt the user to look at the center of the screen, and while looking press C. This should calibrate the eye tracker
Then return to the testing site and press "start" to actualy begin.
When all 3 cpt card trials are done, go back to the eye tracking window and press Q to end the eye tracking session.


PYTHON EYE:
python .\eye_tracking\MonitorTracking.py