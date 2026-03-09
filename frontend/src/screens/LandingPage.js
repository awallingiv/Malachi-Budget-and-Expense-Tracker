import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Color palette matching ModernDashboard
const colors = {
  background: '#0a0f1a',
  cardBg: 'rgba(255, 255, 255, 0.03)',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  primary: '#00d4aa',
  secondary: '#667eea',
  accent: '#4ecdc4',
  purple: '#764ba2',
  text: '#ffffff',
  textMuted: 'rgba(255, 255, 255, 0.7)',
  textDim: 'rgba(255, 255, 255, 0.5)',
  danger: '#ff6b6b',
  warning: '#ffd93d',
};

// Animated feature card component
const FeatureCard = ({ icon, title, description, delay = 0, color }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.featureCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          borderColor: color || colors.cardBorder,
        },
      ]}
    >
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </Animated.View>
  );
};

// Stat badge component
const StatBadge = ({ value, label, delay = 0 }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.statBadge, { transform: [{ scale: scaleAnim }] }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
};

export default function LandingPage({ onLogin, onSignup }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const heroSlideAnim = useRef(new Animated.Value(50)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.8)).current;
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const isMobile = dimensions.width < 768;
  const isSmall = dimensions.width < 500;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(heroSlideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(logoScaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const features = [
    {
      icon: '💰',
      title: 'Smart Budgeting',
      description: 'Track every dollar with intuitive expense groupings and category breakdowns.',
      color: 'rgba(0, 212, 170, 0.3)',
    },
    {
      icon: '⛪',
      title: 'Giving Tracker',
      description: 'Automatically track charitable giving as expenses with a dedicated category and toggle.',
      color: 'rgba(102, 126, 234, 0.3)',
    },
    {
      icon: '📊',
      title: 'Visual Insights',
      description: 'Beautiful charts and spending breakdowns to understand your financial health.',
      color: 'rgba(78, 205, 196, 0.3)',
    },
    {
      icon: '📱',
      title: 'Cross-Platform',
      description: 'Access your budget anywhere — web, iOS, and Android all in sync.',
      color: 'rgba(255, 107, 107, 0.3)',
    },
    {
      icon: '🏷️',
      title: 'Expense Groupings',
      description: 'Organize transactions into custom groups for better spending visibility.',
      color: 'rgba(255, 217, 61, 0.3)',
    },
    {
      icon: '🔒',
      title: 'Secure & Private',
      description: 'Your financial data is encrypted and never shared with third parties.',
      color: 'rgba(164, 176, 190, 0.3)',
    },
  ];

  return (
    <View style={styles.container}>
      {/* Background decorations */}
      <View style={styles.backgroundGradient} />
      <View style={styles.backgroundOrb1} />
      <View style={styles.backgroundOrb2} />
      <View style={styles.backgroundOrb3} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, isMobile && styles.headerMobile]}>
          <View style={styles.logoSection}>
            <Animated.Text
              style={[styles.logo, { transform: [{ scale: logoScaleAnim }] }]}
            >
              ✨ Malachi
            </Animated.Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.loginButtonHeader} onPress={onLogin}>
              <Text style={styles.loginButtonHeaderText}>Log In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.signupButtonHeader} onPress={onSignup}>
              <Text style={styles.signupButtonHeaderText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Section */}
        <Animated.View
          style={[
            styles.heroSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: heroSlideAnim }],
            },
          ]}
        >
          <Text style={[styles.heroTagline]}>Personal Finance, Simplified</Text>
          <Text style={[styles.heroTitle, isSmall && styles.heroTitleSmall]}>
            Budget, Track, and{'\n'}
            <Text style={styles.heroHighlight}>Give Generously</Text>
          </Text>
          <Text style={[styles.heroSubtitle, isSmall && styles.heroSubtitleSmall]}>
            The all-in-one budget app with built-in giving tracker.{'\n'}
            Take control of your finances and your generosity.
          </Text>

          <View style={[styles.heroCTA, isSmall && styles.heroCTASmall]}>
            <TouchableOpacity style={styles.primaryButton} onPress={onSignup}>
              <Text style={styles.primaryButtonText}>Create Free Account</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={onLogin}>
              <Text style={styles.secondaryButtonText}>Sign In →</Text>
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={[styles.statsRow, isSmall && styles.statsRowSmall]}>
            <StatBadge value="100%" label="Free to Use" delay={200} />
            <StatBadge value="∞" label="Transactions" delay={300} />
            <StatBadge value="24/7" label="Access" delay={400} />
          </View>
        </Animated.View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Everything You Need</Text>
          <Text style={styles.sectionSubtitle}>
            Powerful features to manage your money wisely
          </Text>

          <View style={[styles.featuresGrid, isMobile && styles.featuresGridMobile]}>
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                color={feature.color}
                delay={100 + index * 100}
              />
            ))}
          </View>
        </View>

        {/* Tithe Section */}
        <View style={styles.titheSection}>
          <View style={styles.titheBadge}>
            <Text style={styles.titheBadgeText}>⛪ Built for Givers</Text>
          </View>
          <Text style={styles.titheTitle}>
            Automatic Giving Tracker
          </Text>
          <Text style={styles.titheVerse}>Generosity, simplified</Text>
          <Text style={styles.titheDescription}>
            Opt in to automatically calculate a percentage of every paycheck as a giving expense.
            Track your charitable contributions in a dedicated category — toggle it on or off anytime.
          </Text>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Ready to Take Control?</Text>
          <Text style={styles.ctaSubtitle}>
            Join thousands managing their finances with purpose
          </Text>
          <TouchableOpacity style={styles.ctaButton} onPress={onSignup}>
            <Text style={styles.ctaButtonText}>Start Your Journey — It's Free</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2025 Malachi Budget. Built with ❤️ for intentional living.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 600,
    ...(Platform.OS === 'web'
      ? {
          background: 'linear-gradient(180deg, rgba(102, 126, 234, 0.15) 0%, transparent 100%)',
        }
      : {
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
        }),
  },
  backgroundOrb1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: colors.primary,
    opacity: 0.06,
  },
  backgroundOrb2: {
    position: 'absolute',
    top: 300,
    left: -200,
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: colors.secondary,
    opacity: 0.04,
  },
  backgroundOrb3: {
    position: 'absolute',
    top: 800,
    right: -150,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: colors.accent,
    opacity: 0.05,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 24,
    paddingTop: Platform.OS === 'web' ? 24 : 60,
  },
  headerMobile: {
    flexDirection: 'column',
    gap: 16,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  loginButtonHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  loginButtonHeaderText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  signupButtonHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  signupButtonHeaderText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingTop: 40,
  },
  heroTagline: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 52,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 62,
    marginBottom: 20,
  },
  heroTitleSmall: {
    fontSize: 36,
    lineHeight: 44,
  },
  heroHighlight: {
    color: colors.primary,
  },
  heroSubtitle: {
    fontSize: 18,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 28,
    maxWidth: 500,
    marginBottom: 40,
  },
  heroSubtitleSmall: {
    fontSize: 16,
    lineHeight: 24,
  },
  heroCTA: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    marginBottom: 50,
  },
  heroCTASmall: {
    flexDirection: 'column',
    width: '100%',
  },
  primaryButton: {
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 30,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  secondaryButtonText: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'center',
  },
  statsRowSmall: {
    gap: 16,
  },
  statBadge: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textDim,
    marginTop: 4,
  },
  featuresSection: {
    paddingVertical: 60,
  },
  sectionTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 48,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
  },
  featuresGridMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  featureCard: {
    width: screenWidth > 768 ? 'calc(33.333% - 20px)' : '100%',
    minWidth: 280,
    maxWidth: 360,
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  featureIcon: {
    fontSize: 40,
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  featureDescription: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 22,
  },
  titheSection: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(102, 126, 234, 0.05)',
    borderRadius: 32,
    marginVertical: 40,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.15)',
  },
  titheBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    borderRadius: 20,
    marginBottom: 24,
  },
  titheBadgeText: {
    color: colors.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  titheTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    fontStyle: 'italic',
    maxWidth: 600,
  },
  titheVerse: {
    fontSize: 16,
    color: colors.primary,
    marginTop: 12,
    marginBottom: 24,
    fontWeight: '600',
  },
  titheDescription: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 500,
  },
  ctaSection: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  ctaTitle: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  ctaSubtitle: {
    fontSize: 18,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 36,
  },
  ctaButton: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 30,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  ctaButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 40,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  footerText: {
    fontSize: 14,
    color: colors.textDim,
  },
});
