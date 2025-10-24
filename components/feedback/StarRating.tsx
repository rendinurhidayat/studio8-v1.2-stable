
import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
    count?: number;
    value: number;
    onChange?: (rating: number) => void;
    size?: number;
    isEditable?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({ count = 5, value, onChange, size = 24, isEditable = false }) => {
    const [hoverValue, setHoverValue] = useState<number | undefined>(undefined);

    const stars = Array.from({ length: count }, (_, i) => i + 1);

    const handleMouseOver = (newValue: number) => {
        if (isEditable) setHoverValue(newValue);
    };

    const handleMouseLeave = () => {
        if (isEditable) setHoverValue(undefined);
    };

    const handleClick = (newValue: number) => {
        if (isEditable && onChange) {
            onChange(newValue);
        }
    };

    return (
        <div className="flex items-center gap-1">
            {stars.map((starValue) => (
                <Star
                    key={starValue}
                    size={size}
                    onMouseOver={() => handleMouseOver(starValue)}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handleClick(starValue)}
                    className={`transition-all duration-200 ease-in-out
                        ${(hoverValue || value) >= starValue ? 'text-yellow-400' : 'text-gray-300'}
                        ${isEditable ? 'cursor-pointer transform hover:scale-125' : ''}`
                    }
                    fill={(hoverValue || value) >= starValue ? 'currentColor' : 'none'}
                />
            ))}
        </div>
    );
};

export default StarRating;
