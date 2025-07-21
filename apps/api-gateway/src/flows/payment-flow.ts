
import { Request, Response } from 'express';
import { container } from 'tsyringe';
import { DatabaseService } from '../../../packages/database/src/index';
import { config } from '../config';
import crypto from 'crypto';

export const handleGumroadWebhook = async (req: Request, res: Response) => {
  const signature = req.get('X-Gumroad-Signature');
  const providedSecret = req.get('secret');

  if (providedSecret !== config.GUMROAD_WEBHOOK_SECRET) {
    return res.status(401).send('Unauthorized');
  }

  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).send('Bad Request: Missing user_id');
  }

  try {
    const db = container.resolve(DatabaseService);
    await db.updateUser(user_id, { paymentStatus: 'premium' });
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).send('Internal Server Error');
  }
};
