const supportedMimeTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg'
];

export const getAudioRecordingOptions = () => {
    if (
        typeof MediaRecorder === 'undefined' ||
        typeof MediaRecorder.isTypeSupported !== 'function'
    ) {
        return {};
    }

    const mimeType = supportedMimeTypes.find(type => MediaRecorder.isTypeSupported(type));
    return mimeType ? { mimeType } : {};
};

export const getAudioFileExtension = (mimeType) => {
    const baseMimeType = mimeType?.split(';')[0]?.toLowerCase();
    const extensions = {
        'audio/webm': 'webm',
        'audio/mp4': 'm4a',
        'audio/ogg': 'ogg',
        'audio/mpeg': 'mp3',
        'audio/wav': 'wav'
    };

    return extensions[baseMimeType] || 'audio';
};
