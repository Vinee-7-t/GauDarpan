import React, { useState, useRef } from 'react';
import { Box, Button, Typography, CircularProgress, Paper } from '@mui/material';
import * as tmImage from '@teachablemachine/image';

interface ModelAnalyzerProps {
  modelUrl: string;
  title: string;
}

const ModelAnalyzer: React.FC<ModelAnalyzerProps> = ({ modelUrl, title }) => {
  const [predictions, setPredictions] = useState<Array<{ className: string; probability: number }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeImage = async (file: File) => {
    try {
      setIsLoading(true);
      setError(null);

      // Load the model
      const model = await tmImage.load(`${modelUrl}/model.json`, `${modelUrl}/metadata.json`);

      // Create an image element
      const imageElement = document.createElement('img');
      imageElement.src = URL.createObjectURL(file);
      await new Promise((resolve) => (imageElement.onload = resolve));

      // Make prediction
      const predictions = await model.predict(imageElement);
      setPredictions(predictions);
    } catch (err) {
      setError('Error analyzing image. Please try again.');
      console.error('Analysis error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      analyzeImage(file);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {title}
      </Typography>
      
      <Button
        variant="contained"
        component="label"
        disabled={isLoading}
      >
        Upload Image
        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept="image/*"
          onChange={handleFileUpload}
        />
      </Button>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}

      {predictions.length > 0 && (
        <Paper sx={{ mt: 2, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Analysis Results
          </Typography>
          {predictions.map((prediction, index) => (
            <Box key={index} sx={{ mb: 1 }}>
              <Typography>
                {prediction.className}: {(prediction.probability * 100).toFixed(2)}%
              </Typography>
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  );
};

export default ModelAnalyzer;
