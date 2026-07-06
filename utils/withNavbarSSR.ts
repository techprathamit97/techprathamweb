import { GetServerSideProps } from 'next';
import { getNavbarData, NavbarData } from './navbarData';

/**
 * Higher-order function to add navbar data to any page's getServerSideProps
 * Usage: export const getServerSideProps = withNavbarSSR(async (context) => { ... })
 */
export function withNavbarSSR<P extends { navbarData: NavbarData }>(
  getServerSidePropsFunc?: GetServerSideProps<Omit<P, 'navbarData'>>
): GetServerSideProps<P> {
  return async (context) => {
    try {
      // Fetch navbar data
      const navbarData = await getNavbarData();

      // If there's a custom getServerSideProps function, call it
      if (getServerSidePropsFunc) {
        const result = await getServerSidePropsFunc(context);
        
        if ('props' in result) {
          return {
            ...result,
            props: {
              ...result.props,
              navbarData,
            } as P,
          };
        }
        
        // Handle redirects and notFound
        return result as any;
      }

      // Default case - just return navbar data
      return {
        props: {
          navbarData,
        } as P,
      };
    } catch (error) {
      console.error('Error in withNavbarSSR:', error);
      
      // Fallback - still try to get navbar data
      const navbarData = await getNavbarData();
      
      if (getServerSidePropsFunc) {
        try {
          const result = await getServerSidePropsFunc(context);
          if ('props' in result) {
            return {
              ...result,
              props: {
                ...result.props,
                navbarData,
              } as P,
            };
          }
          return result as any;
        } catch {
          return {
            props: {
              navbarData,
            } as P,
          };
        }
      }

      return {
        props: {
          navbarData,
        } as P,
      };
    }
  };
}