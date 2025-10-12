import { render, screen } from '@testing-library/react';
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
    discogsUrl: 'https://www.discogs.com/release/12345',
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

  it('wraps the card in a link to the Discogs page', () => {
    render(<AlbumCard {...mockProps} />);

    const linkElement = screen.getByRole('link');
    expect(linkElement).toBeInTheDocument();
    expect(linkElement).toHaveAttribute('href', mockProps.discogsUrl);
    expect(linkElement).toHaveAttribute('target', '_blank');
    expect(linkElement).toHaveAttribute('rel', 'noopener noreferrer');
    expect(linkElement).toHaveAttribute(
      'aria-label',
      `View ${mockProps.artist} - ${mockProps.title} on Discogs`,
    );
  });
});
