// src/components/home/SwipeableCard.js
const React = require('react');
const {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
} = require('react-native');
const { useRef } = React;
const { LinearGradient } = require('expo-linear-gradient');
const Colors = require('../../theme/Colors');

const { width, height } = Dimensions.get('window');

const SwipeableCard = ({ profile, onSwipe }) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const likeOpacity = useRef(new Animated.Value(0)).current;
  const passOpacity = useRef(new Animated.Value(0)).current;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      pan.setValue({ x: gesture.dx, y: gesture.dy });

      if (gesture.dx > 50) {
        likeOpacity.setValue(Math.min(1, gesture.dx / 200));
      } else if (gesture.dx < -50) {
        passOpacity.setValue(Math.min(1, Math.abs(gesture.dx) / 200));
      }
    },
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dx) > 120) {
        const direction = gesture.dx > 0 ? 'right' : 'left';
        const action = direction === 'right' ? 'like' : 'pass';

        Animated.timing(pan, {
          toValue: { x: gesture.dx > 0 ? 500 : -500, y: gesture.dy },
          duration: 200,
          useNativeDriver: false,
        }).start(() => {
          onSwipe(action, profile);
          pan.setValue({ x: 0, y: 0 });
          likeOpacity.setValue(0);
          passOpacity.setValue(0);
        });
      } else if (Math.abs(gesture.dy) > 100 && gesture.dy < 0) {
        Animated.timing(pan, {
          toValue: { x: 0, y: -500 },
          duration: 200,
          useNativeDriver: false,
        }).start(() => {
          onSwipe('superlike', profile);
          pan.setValue({ x: 0, y: 0 });
        });
      } else {
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          friction: 5,
          useNativeDriver: false,
        }).start();
        likeOpacity.setValue(0);
        passOpacity.setValue(0);
      }
    },
  });

  const cardStyle = {
    transform: pan.getTranslateTransform(),
  };

  return (
    <Animated.View style={[styles.card, cardStyle]} {...panResponder.panHandlers}>
      <Image source={{ uri: profile.profile_picture_url || 'https://via.placeholder.com/400' }} style={styles.cardImage} />

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.cardGradient}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.cardName}>{profile.display_name}</Text>
          <Text style={styles.cardAge}>{profile.age}</Text>
        </View>
        <Text style={styles.cardCity}>{profile.city || 'Location not set'}</Text>
      </LinearGradient>

      {profile.tribes && profile.tribes.length > 0 && (
        <View style={styles.cardBadge}>
          <Text>🏷️</Text>
          <Text style={styles.cardBadgeText}>{profile.tribes[0].name}</Text>
        </View>
      )}

      {/* Swipe indicators */}
      <Animated.View style={[styles.swipeLabel, styles.swipeLabelRight, { opacity: likeOpacity }]}>
        <Text style={[styles.swipeLabelText, styles.swipeLabelTextLike]}>LIKE</Text>
      </Animated.View>

      <Animated.View style={[styles.swipeLabel, styles.swipeLabelLeft, { opacity: passOpacity }]}>
        <Text style={[styles.swipeLabelText, styles.swipeLabelTextPass]}>PASS</Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: width * 0.9,
    height: height * 0.7,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '70%',
    resizeMode: 'cover',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    justifyContent: 'flex-end',
    padding: 20,
  },
  cardName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
  },
  cardAge: {
    fontSize: 20,
    color: Colors.text,
    marginLeft: 8,
  },
  cardCity: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  cardBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardBadgeText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  swipeLabel: {
    position: 'absolute',
    top: 50,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    transform: [{ rotate: '-15deg' }],
  },
  swipeLabelLeft: {
    left: 20,
    borderWidth: 3,
    borderColor: Colors.pass,
  },
  swipeLabelRight: {
    right: 20,
    borderWidth: 3,
    borderColor: Colors.like,
  },
  swipeLabelText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  swipeLabelTextPass: {
    color: Colors.pass,
  },
  swipeLabelTextLike: {
    color: Colors.like,
  },
});

module.exports = SwipeableCard;
