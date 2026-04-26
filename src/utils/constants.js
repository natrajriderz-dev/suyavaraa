const tribesData = [
  // Dating Tribes
  { slug: 'adventure-seekers', name: 'Adventure Seekers', icon: '🏔️', category: 'dating' },
  { slug: 'foodies', name: 'Foodies', icon: '🍜', category: 'dating' },
  { slug: 'fitness-freaks', name: 'Fitness Freaks', icon: '💪', category: 'dating' },
  { slug: 'book-worms', name: 'Book Worms', icon: '📚', category: 'dating' },
  { slug: 'art-culture', name: 'Art & Culture', icon: '🎨', category: 'dating' },
  { slug: 'tech-geeks', name: 'Tech Geeks', icon: '💻', category: 'dating' },
  { slug: 'music-lovers', name: 'Music Lovers', icon: '🎵', category: 'dating' },
  { slug: 'spiritual-dating', name: 'Spiritual (Dating)', icon: '🧘', category: 'dating' },
  // Matrimony Zones
  { slug: 'traditional', name: 'Traditional', icon: '🏛️', category: 'matrimony' },
  { slug: 'modern', name: 'Modern', icon: '🌟', category: 'matrimony' },
  { slug: 'spiritual-matrimony', name: 'Spiritual (Matrimony)', icon: '🕉️', category: 'matrimony' },
  { slug: 'academic', name: 'Academic', icon: '🎓', category: 'matrimony' },
  { slug: 'creative', name: 'Creative', icon: '🎭', category: 'matrimony' },
  { slug: 'adventurous', name: 'Adventurous', icon: '🧗', category: 'matrimony' },
  { slug: 'homely', name: 'Homely', icon: '🏠', category: 'matrimony' },
  { slug: 'cosmopolitan', name: 'Cosmopolitan', icon: '🌆', category: 'matrimony' },
];

const getDatingTribes = () => {
  return tribesData.filter(tribe => tribe.category === 'dating');
};

const getMatrimonyZones = () => {
  return tribesData.filter(tribe => tribe.category === 'matrimony');
};

module.exports = {
  tribesData,
  getDatingTribes,
  getMatrimonyZones,
};