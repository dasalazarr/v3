
import { container } from 'tsyringe';
import { DatabaseService } from '../index';
import { users } from '../schema';
import { eq } from 'drizzle-orm';

const checkUserStatus = async (phoneNumber: string) => {
  const db = container.resolve(DatabaseService);
  const user = await db.query.users.findFirst({
    where: eq(users.phoneNumber, phoneNumber),
  });

  if (!user) {
    console.log(`User with phone number ${phoneNumber} not found.`);
    return;
  }

  console.log(`User: ${user.phoneNumber}`);
  console.log(`Status: ${user.paymentStatus}`);

  if (user.paymentStatus === 'premium' && user.premiumActivatedAt) {
    const premiumDurationDays = 30;
    const activationDate = new Date(user.premiumActivatedAt);
    const expirationDate = new Date(activationDate.getTime() + premiumDurationDays * 24 * 60 * 60 * 1000);
    const remainingTime = expirationDate.getTime() - new Date().getTime();
    const remainingDays = Math.ceil(remainingTime / (1000 * 60 * 60 * 24));

    console.log(`Premium Period Valid Until: ${expirationDate.toISOString().split('T')[0]}`);
    console.log(`(Remaining: ${remainingDays} days)`);
  }
};

const phoneNumber = process.argv[2];
if (!phoneNumber) {
  console.log('Please provide a phone number as an argument.');
  process.exit(1);
}

checkUserStatus(phoneNumber);
