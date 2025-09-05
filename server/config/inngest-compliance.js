// Data Retention & Anonymization
const dataRetentionManager = inngest.createFunction(
  { id: 'data-retention-manager' },
  { cron: '0 3 * * 0' }, // Weekly on Sunday at 3 AM
  async ({ step }) => {
    // Anonymize old data (HIPAA requirement)
    await step.run('anonymize-old-data', async () => {
      const User = require('../models/User');
      const CrisisAlert = require('../models/CrisisAlert');
      
      const sevenYearsAgo = new Date();
      sevenYearsAgo.setFullYear(sevenYearsAgo.getFullYear() - 7);
      
      // Anonymize user data older than 7 years
      const anonymized = await User.updateMany(
        { createdAt: { $lt: sevenYearsAgo }, anonymized: { $ne: true } },
        {
          $set: {
            name: 'Anonymous User',
            email: `anonymous_${Date.now()}@example.com`,
            phone: null,
            anonymized: true,
            anonymizedAt: new Date()
          }
        }
      );

      return { anonymizedUsers: anonymized.modifiedCount };
    });

    // Archive resolved alerts
    await step.run('archive-resolved-alerts', async () => {
      const CrisisAlert = require('../models/CrisisAlert');
      const ArchivedAlert = require('../models/ArchivedAlert');
      
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      const resolvedAlerts = await CrisisAlert.find({
        status: 'resolved',
        updatedAt: { $lt: oneYearAgo }
      });

      if (resolvedAlerts.length > 0) {
        await ArchivedAlert.insertMany(resolvedAlerts);
        await CrisisAlert.deleteMany({
          _id: { $in: resolvedAlerts.map(a => a._id) }
        });
      }

      return { archivedAlerts: resolvedAlerts.length };
    });
  }
);

// Audit Trail Generator
const auditTrailGenerator = inngest.createFunction(
  { id: 'audit-trail-generator' },
  { event: 'audit/log-required' },
  async ({ event, step }) => {
    await step.run('create-audit-log', async () => {
      const AuditLog = require('../models/AuditLog');
      const { action, userId, metadata, ipAddress } = event.data;
      
      await AuditLog.create({
        action,
        userId,
        metadata,
        ipAddress,
        timestamp: new Date(),
        sessionId: metadata.sessionId,
        userAgent: metadata.userAgent
      });

      return { logged: true };
    });

    // Check for suspicious activity
    await step.run('security-check', async () => {
      const AuditLog = require('../models/AuditLog');
      const { userId, ipAddress } = event.data;
      
      // Check for multiple failed login attempts
      const recentFailures = await AuditLog.countDocuments({
        action: 'login_failed',
        $or: [{ userId }, { 'metadata.ipAddress': ipAddress }],
        timestamp: { $gte: new Date(Date.now() - 15 * 60 * 1000) } // Last 15 minutes
      });

      if (recentFailures >= 5) {
        await inngest.send({
          name: 'security/suspicious-activity',
          data: { userId, ipAddress, failureCount: recentFailures }
        });
      }

      return { securityChecked: true };
    });
  }
);

// Backup & Recovery
const backupManager = inngest.createFunction(
  { id: 'backup-manager' },
  { cron: '0 2 * * *' }, // Daily at 2 AM
  async ({ step }) => {
    await step.run('create-backup', async () => {
      const AWS = require('aws-sdk');
      const s3 = new AWS.S3();
      const mongoose = require('mongoose');
      
      // Export critical collections
      const collections = ['users', 'crisisalerts', 'auditlogs'];
      const backupData = {};
      
      for (const collection of collections) {
        const data = await mongoose.connection.db.collection(collection).find({}).toArray();
        backupData[collection] = data;
      }

      // Upload to S3 with encryption
      const backupKey = `backups/${new Date().toISOString().split('T')[0]}/mindbridge-backup.json`;
      
      await s3.putObject({
        Bucket: process.env.BACKUP_BUCKET,
        Key: backupKey,
        Body: JSON.stringify(backupData),
        ServerSideEncryption: 'AES256',
        Metadata: {
          'backup-date': new Date().toISOString(),
          'collections': collections.join(',')
        }
      }).promise();

      return { backupKey, collections: collections.length };
    });

    // Cleanup old backups
    await step.run('cleanup-old-backups', async () => {
      const AWS = require('aws-sdk');
      const s3 = new AWS.S3();
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const objects = await s3.listObjectsV2({
        Bucket: process.env.BACKUP_BUCKET,
        Prefix: 'backups/'
      }).promise();

      const oldObjects = objects.Contents.filter(obj => 
        obj.LastModified < thirtyDaysAgo
      );

      if (oldObjects.length > 0) {
        await s3.deleteObjects({
          Bucket: process.env.BACKUP_BUCKET,
          Delete: {
            Objects: oldObjects.map(obj => ({ Key: obj.Key }))
          }
        }).promise();
      }

      return { deletedBackups: oldObjects.length };
    });
  }
);

module.exports = {
  dataRetentionManager,
  auditTrailGenerator,
  backupManager
};
