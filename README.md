

![Screenshot_25-11-2025_22249_github com](https://github.com/user-attachments/assets/eaec2ef0-7c22-4fc5-9d02-0224600fb150)






# ADVEYES


## High Level Overview
ADVEYES is a research project exploring a more accessible way to capture **objective attention signals** using common hardware (laptop webcam + mic), especially for people with unstable medical insurance or limited financial resources. Traditional ADHD evaluation often relies heavily on self-reporting and long clinical assessments; our goal is to pair a short task battery with measurable **gaze**, **behavioral**, and **speech** markers.


**Research goal:** Evaluate whether gaze/head movement + speech-based metrics collected during short tasks can help **distinguish clinically diagnosed ADHD participants from controls** in a controlled lab setting.

**What we built:** A web-based 4-task battery + a data pipeline for webcam eye tracking (Card CPT) and audio feature extraction (Stroop, Free Speech, Math).


## Experiment Process / Setup
We created a simple scheduling pipeline to run the expirement with participants in our lab:
- **Google Form** for participants to fill out and ** give consent to participate in our study**
- **Calendly** for scheduling sessions with our Participants
- **Participants:** **10 clinically diagnosed ADHD** + **10 non-ADHD** 

During lab sessions we collected:
- **Eye tracking / Body Tracking (Head Movement)** (only during Card CPT)
- **Audio recordings** (during Stroop, Free Speech, and Math/Number Sense)

---

## Tasks

### Card CPT (Eye Tracking + Performance)
A sustained-attention task where participants respond to target stimuli across repeated trials.

**Captured data:**
- Webcam-based eye tracking session data
- Task performance (responses + timing)



![Screenshot_23-12-2025_134513_localhost](https://github.com/user-attachments/assets/2015f09b-5666-463f-9884-97b2c7e9eb2c)


![Screenshot_23-12-2025_134612_localhost](https://github.com/user-attachments/assets/649967ba-fb88-42de-aa14-6013e292af21)




<img width="1527" height="855" alt="Screenshot 2025-12-18 015015" src="https://github.com/user-attachments/assets/a1945999-37c6-44e3-92c1-6068972ddfab" />






---

### Stroop CPT (Audio + Key Cognitive Metrics)
A selective attention / inhibition task where Participants answer 69 questions taking on congruent vs incongruent interference.

**Captured data (most important):**
- **Accuracy %** (total number of questions correct)
- **Reaction Time (RT)** = *speech onset − stimulus onset* (ms)
- **RT Interference** = *Mean RT(Incongruent) − Mean RT(Baseline)*
- **Hesitation / Disfluency Count** (speech disruption, strongest in incongruent trials)


![Screenshot_23-12-2025_134733_localhost](https://github.com/user-attachments/assets/aecb0831-b33c-4ffc-9d27-0beaf09725e4)





![Screenshot_23-12-2025_13499_localhost](https://github.com/user-attachments/assets/41efbf95-d4bb-46a9-8590-651fadd53137)




---

### Free Speech Test (Audio)
Participants speak to a prompt for a fixed time window on a nuetral topic.

**Captured data:**
- audio recording for speech feature extraction (pacing, pauses, variability, etc.)



![Screenshot_23-12-2025_134947_localhost](https://github.com/user-attachments/assets/6b51d6d9-9de5-4cb3-9453-7a12ba1df34e)



---

### Math and Number Sense Test (Audio + Performance)
Participants solve number-sense / reasoning questions and explain answers out loud while working through the math questions.

**Captured data:**
- Harmonics To Noise Ratio
- Jitter
- RT
- Pitch/Intensity


![Screenshot_23-12-2025_13504_localhost](https://github.com/user-attachments/assets/edb5d829-b72c-455a-9e58-c7833184fd0b)


![Screenshot_23-12-2025_135012_localhost](https://github.com/user-attachments/assets/a955c85d-af4a-41e8-a085-8b40a5510ae0)

### Eye Tracking / Body Tracking Model (Card CPT only)
We trained a **Logistic Regression** classifier using gaze/head movement data captured from our participants during the Card CPT.
- Input stream is based on **quaternion rotation** data
- We extract gaze movement features (e.g., saccades/fixations) and apply a **sliding window** to capture short-term temporal context

### Audio Processing (Stroop + Free Speech + Number Sense)
We process all 20 of our participant `.wav` files using **Praat** to extract speech features (e.g., pitch, jitter, HNR, speech burts, Intensity, Reaction Time(MS), etc).
To compare participants consistently, we compute **group-level statistics** (including **standard deviation** and **z-scores**) and evaluate separation between ADHD vs non-ADHD groups based on reaction time and average combined score.


### Research Poster 

![Screenshot_23-12-2025_144739_www linkedin com](https://github.com/user-attachments/assets/e42f1f21-bb3b-440a-abc4-61760dafb07a)



## Future Roadmap

- **Expand the dataset**
  - Recruit a larger and more diverse participant pool (age, gender, clinical subtypes) to improve generalization instead of just UTD Based students
  - Add repeated sessions per participant to measure within-person consistency over time.

- **Improve calibration + robustness**
  - Make eye-tracking calibration fully guided in-app (step-by-step UI instead of manual key presses).
  - Reduce sensitivity to lighting, camera quality, and head pose drift during Card CPT.

- **Unify data collection + exports**
  - Standardize a single session output format (CSV/JSON) across all tasks.

- **Stronger modeling + validation**
  - Compare Logistic Regression to stronger baselines (SVM, Random Forest, gradient boosting).
  - Add cross-validation and holdout testing with clear reporting (accuracy, F1, ROC-AUC).

- **Better speech analytics**
  - Extend beyond Praat features with richer audio markers (pause structure, speech rate, prosody variability).
  - Improve detection for disfluencies and “false triggers” (self-corrections) during Stroop.
