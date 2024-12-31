const verifyFaceData = async (loginFaceData, storedFaceData) => {
  try {
    // Check if we have valid data
    if (!loginFaceData?.descriptors?.[0] || !storedFaceData?.descriptors) {
      console.error('Invalid face data provided:', { 
        loginDescriptors: !!loginFaceData?.descriptors,
        storedDescriptors: !!storedFaceData?.descriptors 
      });
      return false;
    }

    // More lenient threshold for face matching
    const threshold = 0.6; // More tolerant threshold
    const loginDescriptor = loginFaceData.descriptors[0];

    // Compare with stored descriptors
    const matches = storedFaceData.descriptors.map(descriptor => {
      const distance = euclideanDistance(loginDescriptor, descriptor);
      console.log('Face match distance:', distance); // Debug log
      return distance < threshold;
    });

    // Only require 1 good match for better usability
    const matchCount = matches.filter(Boolean).length;
    console.log('Match count:', matchCount); // Debug log
    return matchCount >= 1;

  } catch (error) {
    console.error('Face verification error:', error);
    return false;
  }
};

const euclideanDistance = (desc1, desc2) => {
  if (!desc1 || !desc2 || desc1.length !== desc2.length) {
    return Infinity;
  }
  return Math.sqrt(
    desc1.reduce((sum, val, i) => sum + Math.pow(val - desc2[i], 2), 0)
  );
};

module.exports = { verifyFaceData }; 