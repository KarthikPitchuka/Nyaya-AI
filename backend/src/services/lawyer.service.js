export const mockLawyers = [
    {
        id: 1,
        name: "Advocate Ramesh Kumar",
        specialty: "Cyber Crime",
        experience: "12 Years",
        rating: 4.8,
        fee: "₹1,500/consultation",
        location: "Hyderabad",
        imageUrl: "https://i.pravatar.cc/150?u=ramesh",
    },
    {
        id: 2,
        name: "Advocate Priya Singh",
        specialty: "Employment Dispute",
        experience: "8 Years",
        rating: 4.7,
        fee: "₹2,000/consultation",
        location: "Bangalore",
        imageUrl: "https://i.pravatar.cc/150?u=priya",
    },
    {
        id: 3,
        name: "Advocate Rajesh Sharma",
        specialty: "Property Law",
        experience: "15 Years",
        rating: 4.9,
        fee: "₹3,000/consultation",
        location: "Delhi",
        imageUrl: "https://i.pravatar.cc/150?u=rajesh",
    },
    {
        id: 4,
        name: "Advocate Sneha Reddy",
        specialty: "Family Law",
        experience: "10 Years",
        rating: 4.6,
        fee: "₹1,200/consultation",
        location: "Chennai",
        imageUrl: "https://i.pravatar.cc/150?u=sneha",
    },
    {
        id: 5,
        name: "Advocate Vikram Patel",
        specialty: "Corporate Law",
        experience: "20 Years",
        rating: 4.9,
        fee: "₹5,000/consultation",
        location: "Mumbai",
        imageUrl: "https://i.pravatar.cc/150?u=vikram",
    },
    {
        id: 6,
        name: "Advocate Anita Desai",
        specialty: "Criminal Defense",
        experience: "14 Years",
        rating: 4.8,
        fee: "₹2,500/consultation",
        location: "Pune",
        imageUrl: "https://i.pravatar.cc/150?u=anita",
    }
];

export const getLawyersForCase = (caseType) => {
    // Simple keyword matching for demo purposes
    const keywords = caseType.toLowerCase().split(' ');

    let matched = mockLawyers.filter(lawyer => {
        return keywords.some(word => lawyer.specialty.toLowerCase().includes(word));
    });

    // If no exact match, return top rated random lawyers
    if (matched.length === 0) {
        matched = mockLawyers.sort((a, b) => b.rating - a.rating).slice(0, 2);
    }

    return matched.slice(0, 3); // Return top 3 matches
};
