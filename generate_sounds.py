import numpy as np
import wave
import struct

def generate_warning_sound(filename, duration=0.5, frequency=800):
    """Generate warning beep sound"""
    sample_rate = 44100
    num_samples = int(sample_rate * duration)
    
    # Generate sine wave with decay
    t = np.linspace(0, duration, num_samples)
    audio = np.sin(2 * np.pi * frequency * t) * np.exp(-3 * t)
    
    # Normalize to 16-bit range
    audio = np.int16(audio * 32767)
    
    # Write WAV file
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(audio.tobytes())

def generate_ready_sound(filename, duration=0.8):
    """Generate ready/success sound"""
    sample_rate = 44100
    num_samples = int(sample_rate * duration)
    
    # Generate ascending tone
    t = np.linspace(0, duration, num_samples)
    frequency = 400 + (t * 400)
    audio = np.sin(2 * np.pi * frequency * t) * np.exp(-2 * t)
    
    # Normalize to 16-bit range
    audio = np.int16(audio * 32767)
    
    # Write WAV file
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(audio.tobytes())

# Generate sounds
generate_warning_sound('sounds/warning.wav')
generate_ready_sound('sounds/ready.wav')

print('Audio files generated successfully!')
print('- sounds/warning.wav')
print('- sounds/ready.wav')
