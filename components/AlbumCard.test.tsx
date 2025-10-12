import { render, screen } from '@testing-library/react';
// FIX: Import 'vi' from 'vitest' to resolve 'Cannot find name' error.
import { describe, it, expect, vi } from 'vitest';
import AlbumCard from './AlbumCard';

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} />,
}));


describe('AlbumCard', () => {
  const mockProps = {
    imageUrl: 'https://example.com/image.jpg',
    title: 'Test Album Title',
    artist: 'Test Artist Name',
  };

  it('renders the album title and artist name', () => {
    render(<AlbumCard {...mockProps} />);
    
    expect(screen.getByText('Test Album Title')).toBeInTheDocument();
    expect(screen.getByText('Test Artist Name')).toBeInTheDocument();
  });

  it('renders the image with the correct src and alt text', () => {
    render(<AlbumCard {...mockProps} />);
    
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', mockProps.imageUrl);
    expect(image).toHaveAttribute('alt', `${mockProps.artist} - ${mockProps.title}`);
  });
});