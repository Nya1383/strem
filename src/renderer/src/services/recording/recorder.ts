export class StreamRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  public start(stream: MediaStream): void {
    this.stop();
    this.chunks = [];

    const options: MediaRecorderOptions = {
      mimeType: this.getSupportedMimeType()
    };

    try {
      this.mediaRecorder = new MediaRecorder(stream, options);
    } catch (err) {
      console.warn('[StreamRecorder] Preferred mimeType unsupported, falling back to default:', err);
      this.mediaRecorder = new MediaRecorder(stream);
    }

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    this.mediaRecorder.start(1000);
    console.log('[StreamRecorder] Recording started');
  }

  public stop(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'video/webm' });
        this.chunks = [];
        this.mediaRecorder = null;
        console.log('[StreamRecorder] Recording stopped, total size:', blob.size);
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  public isRecording(): boolean {
    return this.mediaRecorder !== null && this.mediaRecorder.state === 'recording';
  }

  public async saveToFile(defaultName = 'strem-capture.webm'): Promise<{ success: boolean; filePath?: string }> {
    const blob = await this.stop();
    if (!blob || blob.size === 0) {
      return { success: false };
    }

    const buffer = await blob.arrayBuffer();
    if (window.electronAPI && window.electronAPI.saveRecording) {
      return await window.electronAPI.saveRecording(buffer, defaultName);
    }

    return { success: false };
  }

  private getSupportedMimeType(): string {
    const types = [
      'video/webm;codecs=h264,opus',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  }
}
