import { exec } from 'child_process';

export async function POST() {
  return new Promise((resolve) => {
    exec('C:\\Users\\Ayman\\Documents\\adveyes\\eye_tracking\\venv\\Scripts\\activate && python C:\\Users\\Ayman\\Documents\\adveyes\\eye_tracking\\MonitorTracking.py', (error, stdout, stderr) => {
      if (error) {
        console.error(stderr);
        resolve(new Response(JSON.stringify({ success: false, error: stderr }), { status: 500 }));
      } else {
        console.log(stdout);
        resolve(new Response(JSON.stringify({ success: true, output: stdout }), { status: 200 }));
      }
    });
  });
}
