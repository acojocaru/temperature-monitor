import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getValidAccessToken } from '../services/auth';
import { updateLastTemperature } from '../services/notifications';

export interface TemperatureData {
  temperature: number;
  lastUpdated: Date;
}

export const useTemperature = (onAuthError?: () => void) => {
  const queryClient = useQueryClient();

  const fetchTemperature = async (): Promise<TemperatureData> => {
    try {
      // Get a valid token (will refresh if needed)
      const token = await getValidAccessToken();
      
      const response = await fetch(
        'https://api.viessmann.com/iot/v1/equipment/installations/2585628/gateways/7736172150862221/devices/0/features/heating.sensors.temperature.outside',
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch temperature data: ${response.status}`);
      }
      
      const data = await response.json();
      // Access the temperature value from the correct path in the response
      const tempValue = data.data.properties.value.value;
      
      // Update last temperature in storage for background checks
      await updateLastTemperature(tempValue);
      
      return {
        temperature: tempValue,
        lastUpdated: new Date()
      };
    } catch (err) {
      // Handle authentication errors
      if (err instanceof Error && 
          (err.message.includes('token') || err.message.includes('auth'))) {
        // Invalidate queries that depend on authentication
        queryClient.invalidateQueries({ queryKey: ['temperature'] });
        
        // Call the onAuthError callback if provided
        if (onAuthError) {
          onAuthError();
        }
      }
      throw err;
    }
  };

  return useQuery({
    queryKey: ['temperature'],
    queryFn: fetchTemperature,
    refetchInterval: 15 * 60 * 1000, // 15 minutes
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    retry: 3,
    refetchOnWindowFocus: true,
    enabled: true, // Only fetch when authenticated
  });
}; 