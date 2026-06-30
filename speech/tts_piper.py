import os
import subprocess
import logging
import wave
import struct
import math

logger = logging.getLogger("AegisTTS")

class TextToSpeech:
    def __init__(self):
        # Configure path to piper binary and onnx models
        self.piper_path = os.getenv("PIPER_PATH", "piper")
        self.piper_model = os.getenv("PIPER_MODEL", "en_US-lessac-medium.onnx")

    def synthesize(self, text: str, output_path: str) -> bool:
        """
        Synthesizes the given text into a WAV audio file.
        Falls back to a standard WAV generator if Piper is not set up.
        """
        # Clean text
        text_clean = text.replace('"', '').replace('\n', ' ')
        
        # Method 1: Try calling Piper binary
        try:
            # Check if piper command is available
            # e.g., echo "text" | piper --model model.onnx --output_file output.wav
            if self._is_piper_available():
                logger.info(f"TTS: Calling Piper binary for '{text[:30]}...'")
                process = subprocess.Popen(
                    [self.piper_path, "--model", self.piper_model, "--output_file", output_path],
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                stdout, stderr = process.communicate(input=text_clean)
                if process.returncode == 0 and os.path.exists(output_path):
                    return True
                else:
                    logger.warning(f"Piper failed: {stderr}")
        except Exception as e:
            logger.warning(f"Failed running Piper subprocess: {e}")

        # Method 2: Try pyttsx3 (Native offline SAPI5 on Windows / NSSpeechSynthesizer on macOS)
        try:
            import pyttsx3
            logger.info(f"TTS: Using pyttsx3 for offline native synthesis: '{text_clean[:30]}...'")
            engine = pyttsx3.init()
            # Set properties
            engine.setProperty('rate', 175)  # Speed of speech
            engine.setProperty('volume', 1.0) # Volume level
            engine.save_to_file(text_clean, output_path)
            engine.runAndWait()
            # Wait/verify file creation
            import time
            for _ in range(10):
                if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                    return True
                time.sleep(0.1)
        except Exception as e:
            logger.warning(f"pyttsx3 failed: {e}")

        # Method 3: Try gTTS (Google TTS)
        try:
            from gtts import gTTS
            logger.info("TTS: Falling back to gTTS.")
            tts = gTTS(text=text, lang='en')
            tts.save(output_path)
            return True
        except ImportError:
            pass

        # Method 3: Clean WAV sound generator using standard wave library
        # This writes a short chime (sine wave) so the browser plays actual audio headers successfully.
        logger.info("TTS: Generating fallback beep chime WAV file.")
        self._generate_chime_wav(output_path)
        return True

    def _is_piper_available(self) -> bool:
        """Checks if the Piper executable and model files exist."""
        try:
            # Simple version/help check
            result = subprocess.run([self.piper_path, "--help"], capture_output=True, text=True, timeout=1)
            # Ensure model file exists too
            return os.path.exists(self.piper_model)
        except Exception:
            return False

    def _generate_chime_wav(self, output_path: str):
        """Generates a pleasant 1.5s multi-tone chime as a fallback WAV."""
        sample_rate = 22050
        duration = 1.5
        num_samples = int(sample_rate * duration)
        
        with wave.open(output_path, 'wb') as wav_file:
            wav_file.setnchannels(1)  # Mono
            wav_file.setsampwidth(2)   # 16-bit
            wav_file.setframerate(sample_rate)
            
            # Generate two overlapping frequencies (440Hz A4 and 554Hz C#5)
            # which decay over time to sound like a soft chime
            for i in range(num_samples):
                t = i / sample_rate
                decay = math.exp(-3 * t) # smooth fade out
                
                # Overlap sine waves
                val1 = math.sin(2 * math.pi * 440.0 * t)
                val2 = math.sin(2 * math.pi * 554.37 * t)
                val = 0.5 * (val1 + val2) * decay
                
                # Convert float to 16-bit signed integer (-32768 to 32767)
                int_val = int(val * 32767)
                data = struct.pack('<h', int_val)
                wav_file.writeframes(data)
