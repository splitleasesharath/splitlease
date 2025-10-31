# Template Components

Page-level layout components that define the overall structure of pages. Templates provide the scaffolding for page layouts by combining organisms, molecules, and atoms.

## Characteristics

- **Page Structure**: Define the overall layout of pages
- **Composition Slots**: Provide slots for content injection
- **Layout Logic**: Handle responsive layout behavior
- **Minimal Business Logic**: Focus on structure, not behavior

## Examples

### MainLayout
```tsx
<MainLayout
  header={<Header />}
  sidebar={<Sidebar />}
  footer={<Footer />}
>
  {/* Page content goes here */}
  <YourPageContent />
</MainLayout>
```

### DashboardLayout
```tsx
<DashboardLayout
  navigation={<DashboardNav />}
  topBar={<DashboardTopBar />}
>
  {/* Dashboard content */}
  <DashboardContent />
</DashboardLayout>
```

### ListingPageLayout
```tsx
<ListingPageLayout
  gallery={<ListingGallery images={listing.images} />}
  details={<ListingDetails listing={listing} />}
  bookingPanel={<BookingPanel listing={listing} />}
  reviews={<ReviewsSection listingId={listing.id} />}
/>
```

## Creating a New Template

1. Identify common page structure patterns
2. Define content slots (props)
3. Implement responsive layout
4. Ensure flexibility for different content
5. Test with various content types

Example structure:
```
templates/
└── MainLayout/
    ├── MainLayout.tsx
    ├── MainLayout.test.tsx
    ├── MainLayout.styles.ts
    └── index.ts
```

## Layout Patterns

### Fixed Header/Footer
```tsx
export const MainLayout = ({ header, children, footer }) => (
  <LayoutContainer>
    <Header>{header}</Header>
    <Main>{children}</Main>
    <Footer>{footer}</Footer>
  </LayoutContainer>
);
```

### Sidebar Layout
```tsx
export const SidebarLayout = ({ sidebar, children }) => (
  <Container>
    <Sidebar>{sidebar}</Sidebar>
    <Content>{children}</Content>
  </Container>
);
```

### Grid Layout
```tsx
export const GridLayout = ({ items, columns = 3 }) => (
  <Grid columns={columns}>
    {items.map(item => (
      <GridItem key={item.id}>{item}</GridItem>
    ))}
  </Grid>
);
```

## Responsive Behavior

Templates should handle responsive layouts:

```tsx
const LayoutContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr;

  @media (min-width: 768px) {
    grid-template-columns: 250px 1fr;
  }

  @media (min-width: 1024px) {
    grid-template-columns: 300px 1fr 250px;
  }
`;
```
