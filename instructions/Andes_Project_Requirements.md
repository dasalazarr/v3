# Project Requirements Document - Andes: AI-Powered Running Coach

### Objetivo Aspiracional
Nuestro objetivo aspiracional —el “norte” que guía todo el proyecto— es crear el entrenador de running más inteligente y personalizado del mercado, capaz de aprender de cada interacción para ayudar a cualquier corredor a conquistar sus metas mientras previene lesiones, y hacerlo accesible para todos a través de WhatsApp.

## 1. App Overview

Andes is a conversational AI running coach implemented as a WhatsApp chatbot, designed to help runners of all levels improve their performance through personalized training plans, real-time feedback, and data-driven insights. The system processes natural language messages to track workouts, provide training recommendations, and offer motivational support.

The name "Andes" reflects the app's goal of helping users conquer their personal mountains, whether they're training for a marathon or just starting their running journey.

## 2. User Flow

Andes now supports multiple entry points to ensure a seamless user experience and accurate tracking.

1.  **Web Onboarding (New)**: Users can initiate their journey from the Andes landing page (`andesrc.com`).
    *   **Action**: User clicks "Start Free" or "Buy Premium" on the landing page.
    *   **Capture**: User is directed to a dedicated page (`andesrc.com/start`) to provide their WhatsApp number.
    *   **Backend Integration**: The provided number is sent to the `v3` backend (`/onboarding/free` or `/onboarding/premium`).
    *   **Redirection**: The backend creates/identifies the user and redirects them to WhatsApp (for free users) or to Gumroad (for premium users with a unique, user-ID-embedded link).
    *   **First Contact (WhatsApp)**: Upon first interaction via WhatsApp, the user receives an automated welcome message.

2.  **Direct WhatsApp Contact**: Users can still directly message the Andes WhatsApp number.
    *   **First Contact**: Users message the Andes WhatsApp number and receive an automated welcome message with basic instructions and an option to set up their profile.

3.  **Onboarding (In-Chat)**: The system guides new users through a brief setup process to understand their fitness level, goals, and availability.

4.  **Daily Interaction**: Users can log workouts through natural language (e.g., "Just ran 5K in 25 minutes, felt great!") or receive scheduled training prompts.

5.  **Workout Processing**: The system analyzes workout data, provides immediate feedback, and adjusts training plans accordingly.

6.  **Progress Tracking**: Users can request progress reports, view statistics, and receive insights about their performance trends.

7.  **Motivational Support**: Andes sends personalized encouragement, training tips, and celebrates achievements.

## 3. Tech Stack & APIs

### Frontend
- **WhatsApp Business API**: Primary user interface for all interactions
- **Responsive Web Dashboard** (Future Phase): For detailed analytics and training plan management

### Backend
- **Node.js & TypeScript**: Core server logic
- **BuilderBot**: Conversation flow management
- **Docker**: Containerization and deployment
- **Google Sheets API**: Primary data storage for user profiles and workout logs
- **Google Calendar API**: For scheduling training sessions and reminders

### AI/ML Components
- **DeepSeek API**: Natural language processing for workout logging
- **Custom Training Algorithms**: For generating and adapting training plans
- **Predictive Analytics**: For injury prevention and performance optimization

### Integrations
- **Strava API** (Future Phase): For automatic workout imports
- **Google Fit/Apple Health** (Future Phase): For comprehensive health data integration

## 4. Core Features

1. **Natural Language Processing**: Understands workout logs and fitness-related queries in natural language.

2. **Personalized Training Plans**: Creates and adapts training plans based on user goals and progress.

3. **Workout Analysis**: Provides immediate feedback on workout performance and effort.

4. **Progress Tracking**: Visualizes performance trends and improvements over time.

5. **Injury Prevention**: Identifies potential overtraining and suggests recovery periods.

6. **Race Preparation**: Specialized training plans for race distances from 5K to marathon.

7. **Nutrition Guidance**: Basic nutrition tips and hydration reminders.

8. **Community Challenges**: (Future Phase) Group challenges and virtual races.

## 5. In-Scope vs. Out-of-Scope

### In-Scope
- Personalized running plans based on user goals
- Natural language workout logging and analysis
- Progress tracking and performance analytics
- Training plan adjustments based on feedback
- Basic nutrition and recovery guidance
- Integration with Google Calendar for training schedules
- WhatsApp-based notifications and reminders

### Out-of-Scope
- Medical advice or diagnosis
- Physical therapy or rehabilitation programs
- Integration with wearable devices (initial version)
- In-app payment processing
- Live coaching sessions
- Multi-user training groups (initial version)

## 6. Non-Functional Requirements

### Performance
- Response time under 2 seconds for standard queries
- Support for up to 5,000 concurrent users
- 99.9% uptime during peak hours (6-9 AM & 5-8 PM local time)

### Security
- End-to-end encryption for all messages
- Secure storage of personal health information
- Compliance with data protection regulations (GDPR, CCPA)
- Regular security audits and updates

### Scalability
- Microservices architecture for independent scaling of components
- Caching layer for frequently accessed data
- Queue-based processing for resource-intensive operations

### Usability
- Intuitive, conversation-first interface
- Support for both metric and imperial units
- Multilingual support (initially English and Spanish)
- Accessibility features for users with disabilities

## 7. Success Metrics

1. **User Engagement**
   - Daily Active Users (DAU) / Monthly Active Users (MAU) ratio
   - Average session duration
   - Message response rate

2. **Training Effectiveness**
   - Average improvement in running pace/distance
   - Training plan adherence rate
   - User-reported satisfaction with training recommendations

3. **Technical Performance**
   - API response times
   - Error rates
   - System uptime

4. **Business Metrics**
   - User retention rate
   - Net Promoter Score (NPS)
   - Conversion rate from free to premium (future)

## 8. Future Enhancements

1. **Advanced Analytics**
   - Machine learning models for performance prediction
   - Injury risk assessment
   - Race time prediction

2. **Social Features**
   - Virtual running groups
   - Challenge leaderboards
   - Social sharing of achievements

3. **Wearable Integration**
   - Direct sync with Garmin, Apple Watch, etc.
   - Real-time heart rate and performance metrics
   - Sleep and recovery tracking

4. **Premium Features**
   - Custom training plans
   - One-on-one coaching sessions
   - Advanced analytics and reporting

## 9. Limitations and Constraints

- Dependence on WhatsApp's API limitations
- Accuracy of natural language processing for workout logging
- Data quality from user-reported metrics
- Need for internet connectivity for all features
- Battery usage considerations for constant tracking

## 10. Implementation Roadmap

### Phase 1: MVP (Current)
- Basic workout logging via WhatsApp
- Simple training plan generation
- Progress tracking

### Phase 2: Enhanced Features
- Advanced analytics dashboard
- Integration with wearables
- Social features

### Phase 3: Premium Offering
- Custom training plans
- Live coaching options
- Advanced performance analytics
