import React from 'react';
import TrainerBatchManagement from './batch-management';

// Completed Batches reuses the exact Batch Management screen (classes, recordings,
// etc.) but filtered to batches whose end date has passed. Batch Management itself
// shows only active (ongoing + upcoming) batches, so the two views never overlap.
const TrainerCompletedBatches = () => {
  return <TrainerBatchManagement viewMode="completed" />;
};

export default TrainerCompletedBatches;
