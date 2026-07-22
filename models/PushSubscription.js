const mongoose = require('mongoose');

const pushSubscriptionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  userType: { type: String, required: true, enum: ['student', 'trainer', 'admin'], index: true },
  subscription: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

pushSubscriptionSchema.index({ userId: 1, userType: 1 }, { unique: true });

if (mongoose.models.PushSubscription) {
  delete mongoose.models.PushSubscription;
}

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);
