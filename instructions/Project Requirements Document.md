# Project Requirements Document - Andes Running Coach Bot 2.0
## Intelligent Memory-Driven WhatsApp Coach

**Version**: 2.0  
**Date**: December 2024  
**Status**: Active Development  

---

## 📋 **Executive Summary**

Andes is an intelligent WhatsApp running coach bot that transforms from a stateless prototype into a memory-driven, adaptive training companion. The system leverages advanced AI orchestration, persistent memory, and scientific training methodologies to provide personalized coaching that evolves with each user interaction.

### **Vision Statement**
"To create the most intelligent and personalized running coach that learns from every interaction, helping runners achieve their goals while preventing injuries through data-driven insights."

### **Mission Statement**
"Democratize access to expert running coaching through AI-powered WhatsApp conversations that remember, learn, and adapt to each runner's unique journey."
### Objetivo Aspiracional
Nuestro objetivo aspiracional —el “norte” que guía todo el proyecto— es crear el entrenador de running más inteligente y personalizado del mercado, capaz de aprender de cada interacción para ayudar a cualquier corredor a conquistar sus metas mientras previene lesiones, y hacerlo accesible para todos a través de WhatsApp.

---

## 🎯 **Core Objectives**

### **Primary Goals**
1. **Memory Persistence**: Transform zero-memory interactions into contextual conversations
2. **Adaptive Training Plans**: Generate scientific VDOT-based plans that evolve with user progress
3. **Injury Prevention**: Proactive monitoring and plan adjustments based on user feedback
4. **High Engagement**: Achieve 45%+ D14 retention through personalized experiences
5. **Commercial Viability**: Build scalable freemium model targeting $12M ARR by Year 3

### **Success Metrics**
- **User Retention**: 45% D14, 25% D30
- **Personalization**: 70%+ responses mention user-specific data
- **Intent Recognition**: F1 score ≥ 0.9 for action classification
- **Response Quality**: <2s average response time
- **Plan Adherence**: 60%+ users complete weekly training targets

---

## 🏗️ **System Architecture**

### **High-Level Architecture**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WhatsApp      │───▶│   API Gateway   │───▶│ LLM Orchestrator│
│   Business API  │    │ (Express+tRPC)  │    │   (DeepSeek)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                       ┌─────────────────┐    ┌─────────────────┐
                       │ Vector Memory   │    │ Plan Generator  │
                       │   (Qdrant)      │    │ (VDOT-based)    │
                       └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │   PostgreSQL    │
                       │ (User Profiles, │
                       │ Runs, Plans)    │
                       └─────────────────┘
```

### **Memory System Architecture**
1. **Short-term Memory** (Redis): Last 20 messages, 24h TTL
2. **Semantic Memory** (Qdrant): Vector embeddings of conversations and runs
3. **Structured Memory** (PostgreSQL): User profiles, training data, analytics

---

## 🚀 **Functional Requirements**

### **FR1: Intelligent Onboarding**
- **Requirement**: Interactive button-driven onboarding that captures comprehensive user profile
- **Components**: Age, goal race, weekly frequency, injury history, motivation, fitness level
- **Acceptance Criteria**: 
  - 90%+ onboarding completion rate
  - Data validation with error handling
  - Bilingual support (ES/EN)

### **FR2: Memory-Driven Conversations**
- **Requirement**: AI that remembers and references previous interactions
- **Components**: Chat buffer, vector search, context injection
- **Acceptance Criteria**:
  - 70%+ responses include personal references
  - Conversation continuity across sessions
  - Context-aware follow-up questions

### **FR3: Adaptive Training Plans**
- **Requirement**: VDOT-based 14-day training blocks that adapt to progress
- **Components**: Fitness assessment, pace calculation, workout generation
- **Acceptance Criteria**:
  - Plans adjust based on completed runs
  - Injury modifications automatic
  - Progressive overload principles applied

### **FR4: Run Logging and Analysis**
- **Requirement**: Natural language run logging with automatic data extraction
- **Components**: NLP processing, structured data storage, trend analysis
- **Acceptance Criteria**:
  - 95%+ accuracy in data extraction
  - Support for various input formats
  - Automatic pace/effort validation

### **FR5: Injury Prevention System**
- **Requirement**: Proactive injury monitoring and plan modifications
- **Components**: Risk assessment, load monitoring, recovery recommendations
- **Acceptance Criteria**:
  - Real-time plan adjustments for reported pain
  - Load progression warnings
  - Recovery protocol suggestions

### **FR6: Progress Tracking and Analytics**
- **Requirement**: Automated bi-weekly summaries with visual progress cards
- **Components**: Metrics calculation, PNG card generation, trend analysis
- **Acceptance Criteria**:
  - Bi-weekly automated summaries
  - Visual progress cards with key metrics
  - Monthly trend analysis and recommendations

---

## 🔧 **Technical Requirements**

### **TR1: Performance Standards**
- **Response Time**: <2s for 95% of interactions
- **Availability**: 99.5% uptime (allowing 3.65h/month downtime)
- **Concurrency**: Support 1000+ simultaneous conversations
- **Scalability**: Horizontal scaling capability

### **TR2: Data Management**
- **Database**: PostgreSQL 15+ with ACID compliance
- **Cache**: Redis 7+ for session management
- **Vector Store**: Qdrant 1.8+ for semantic search
- **Backup**: Daily automated backups with 30-day retention

### **TR3: AI and ML Requirements**
- **LLM**: DeepSeek-LLM-33B with tool-calling support
- **Embeddings**: deepseek-embedding-7B for vector generation
- **Context Window**: Support for 8K+ token conversations
- **Tool Integration**: Structured function calling for actions

### **TR4: Integration Requirements**
- **WhatsApp**: Business API with webhook support
 - **Payment**: Gumroad integration for subscription management
- **Monitoring**: OpenTelemetry for observability
- **CDN**: Image hosting for progress cards

---

## 📱 **User Experience Requirements**

### **UX1: Conversation Flow**
- **Natural Language**: Support casual conversational input
- **Multilingual**: English and Spanish with auto-detection
- **Context Awareness**: References to previous conversations
- **Error Handling**: Graceful degradation with helpful messages

### **UX2: Interactive Elements**
- **Quick Replies**: Buttons for common actions
- **Progress Visualization**: Charts and progress cards
- **Rich Media**: Images, links, and formatted text
- **Accessibility**: Support for screen readers

### **UX3: Personalization**
- **Adaptive Responses**: Tone and complexity based on user level
- **Goal Alignment**: All advice aligned with user's stated goals
- **Progress Recognition**: Celebration of achievements
- **Motivation**: Personalized encouragement based on patterns

---

## 🔐 **Security and Compliance**

### **Data Protection**
- **Encryption**: AES-256 for data at rest, TLS 1.3 for transit
- **Access Control**: Role-based permissions with audit logging
- **Privacy**: GDPR/CCPA compliance with data portability
- **Anonymization**: PII anonymization for analytics

### **API Security**
- **Authentication**: JWT tokens with 24h expiration
- **Rate Limiting**: 100 requests/minute per user
- **Input Validation**: Comprehensive sanitization and validation
- **CORS**: Strict origin validation

---

## 📊 **Business Requirements**

### **BR1: Freemium Model**
```
FREE TIER:
- 5 runs/month logging
- Basic AI responses
- 2 citas/month scheduling

PREMIUM TIER ($19.99/month):
- Unlimited run logging
- Advanced AI with memory
- Personalized training plans
- Progress analytics
- Injury prevention

PRO TIER ($49.99/month):
- Everything Premium +
- Video coaching sessions
- Nutrition guidance
- Community access
```

### **BR2: Growth Targets**
- **Year 1**: 1,000 active users, 100 paying ($20K MRR)
- **Year 2**: 10,000 active users, 1,000 paying ($200K MRR)
- **Year 3**: 50,000 active users, 10,000 paying ($2M MRR)

---

## 🛣️ **Development Roadmap**

### **Phase 1: Foundation (Weeks 1-4)**
- [ ] Mono-repo setup with pnpm workspaces
- [ ] PostgreSQL schema implementation
- [ ] Basic AI orchestration with DeepSeek
- [ ] WhatsApp webhook integration
- [ ] User onboarding flow

### **Phase 2: Intelligence (Weeks 5-8)**
- [ ] Vector memory implementation
- [ ] Context-aware conversations
- [ ] Training plan generation
- [ ] Run logging with NLP
- [ ] Basic analytics

### **Phase 3: Advanced Features (Weeks 9-12)**
- [ ] Automated progress summaries
- [ ] Injury prevention system
- [ ] Payment integration
- [ ] Advanced analytics
- [ ] Performance optimization

### **Phase 4: Production (Weeks 13-16)**
- [ ] Load testing and optimization
- [ ] Monitoring and alerting
- [ ] Security audit
- [ ] Production deployment
- [ ] User acquisition campaigns

---

## 🧪 **Testing Strategy**

### **Testing Requirements**
- **Unit Tests**: 80%+ code coverage
- **Integration Tests**: API endpoint validation
- **E2E Tests**: Complete user journey testing
- **Load Tests**: 1000+ concurrent users
- **Security Tests**: Penetration testing

### **Quality Gates**
- All tests passing in CI/CD
- Code review approval required
- Performance benchmarks met
- Security scan clean

---

## 🚀 **Deployment and Infrastructure**

### **Infrastructure Requirements**
- **Runtime**: Node.js 20+ on Railway/AWS
- **Database**: Neon PostgreSQL or AWS RDS
- **Cache**: Redis Cloud or AWS ElastiCache
- **Vector DB**: Qdrant Cloud
- **CDN**: AWS CloudFront for images

### **Deployment Strategy**
- **Blue-Green Deployment**: Zero-downtime deployments
- **Feature Flags**: Gradual feature rollouts
- **Monitoring**: Real-time performance monitoring
- **Rollback**: Automated rollback on failures

---

## 📈 **Success Criteria and KPIs**

### **Technical KPIs**
- **Uptime**: 99.5%+
- **Response Time**: <2s p95
- **Error Rate**: <0.1%
- **Memory Usage**: <80% of allocated

### **Business KPIs**
- **User Acquisition**: 100 new users/week
- **Retention**: 45% D14, 25% D30
- **Conversion**: 8% free-to-paid
- **Revenue**: $200K ARR by end of Year 1

### **User Experience KPIs**
- **Personalization**: 70% responses with personal data
- **Intent Recognition**: F1 ≥ 0.9
- **User Satisfaction**: NPS ≥ 50
- **Support Tickets**: <5% users requiring support

---

## 🔄 **Risk Assessment and Mitigation**

### **Technical Risks**
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| DeepSeek API Downtime | Medium | High | Multiple LLM provider fallback |
| Database Performance | Low | High | Read replicas and caching |
| Vector Search Latency | Medium | Medium | Optimized indexing and batching |

### **Business Risks**
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| User Acquisition Cost | High | High | Organic growth via word-of-mouth |
| Competitor Launch | Medium | Medium | Feature differentiation and community |
| WhatsApp Policy Change | Low | High | Multi-platform strategy |

---

## 📝 **Acceptance Criteria**

### **Definition of Done**
- [ ] All functional requirements implemented
- [ ] 80%+ test coverage achieved
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Stakeholder approval received

### **Launch Criteria**
- [ ] 100 beta users successfully onboarded
- [ ] <0.1% error rate in production
- [ ] Monitoring and alerting operational
- [ ] Support documentation complete
- [ ] Payment system tested
- [ ] Legal compliance verified

---

**Document Owner**: Development Team  
**Stakeholders**: Product Owner, CTO, Business Development  
**Next Review**: Weekly during development, monthly post-launch  
**Version Control**: All changes tracked in git with approval process