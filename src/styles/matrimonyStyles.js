const { StyleSheet, Dimensions } = require('react-native');

const { width } = Dimensions.get('window');
const isMobile = width < 768;

const matrimonyStyles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginHorizontal: isMobile ? 8 : 0,
    marginVertical: 8,
    overflow: 'hidden',
    // Shadow for iOS
    boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
    // Shadow for Android
    elevation: 3,
    // Flex direction based on screen size
    flexDirection: isMobile ? 'column' : 'row',
    minHeight: 150,
  },
  photoContainer: {
    width: isMobile ? '100%' : 150,
    height: isMobile ? 200 : 150,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  infoContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nameText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#D97706', // Primary brand color for matrimony
  },
  ageHeightText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 8,
  },
  icon: {
    width: 16,
    height: 16,
    tintColor: '#D97706',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D97706',
  },
  filledButton: {
    backgroundColor: '#D97706',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  outlineButtonText: {
    color: '#D97706',
  },
  filledButtonText: {
    color: '#fff',
  },
  separator: {
    color: '#999',
    marginHorizontal: 8,
  },
  trustBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  trustText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

module.exports = { matrimonyStyles };
