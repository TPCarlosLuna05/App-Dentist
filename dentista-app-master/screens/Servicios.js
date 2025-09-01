import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';

export default function Servicios() {
  const navigation = useNavigation();
  const [servicios, setServicios] = useState([]);
  const [filteredServicios, setFilteredServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchServicios();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredServicios(servicios);
    } else {
      const filtered = servicios.filter(servicio => 
        servicio.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (servicio.descripcion && servicio.descripcion.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (servicio.precio && servicio.precio.toString().includes(searchQuery))
      );
      setFilteredServicios(filtered);
    }
  }, [searchQuery, servicios]);

  const fetchServicios = () => {
    setLoading(true);
    console.log('Intentando obtener servicios de la API...');
    
    api.getAllServicios()
      .then(response => {
        console.log('Respuesta recibida:', JSON.stringify(response, null, 2));
        
        if (response.success && Array.isArray(response.data)) {
          console.log(`Se cargaron ${response.data.length} servicios correctamente`);
          setServicios(response.data);
          setFilteredServicios(response.data);
        } else {
          console.error('Formato de respuesta inesperado:', response);
          Alert.alert('Error', 'Los datos recibidos no tienen el formato esperado.');
        }
        
        setLoading(false);
      })
      .catch(error => {
        console.error('Error al cargar servicios:', error);
        Alert.alert('Error', 'Hubo un problema al conectar con el servidor.');
        setLoading(false);
      });
  };

  const deleteServicio = (id) => {
    Alert.alert(
      'Confirmar Eliminación',
      '¿Estás seguro que deseas eliminar este servicio?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: () => {
            setLoading(true);
            console.log(`Intentando eliminar servicio con ID: ${id}`);
            
            api.deleteServicio(id)
              .then(response => {
                console.log('Respuesta de eliminación:', JSON.stringify(response, null, 2));
                
                if (response.success) {
                  setServicios(servicios.filter(servicio => servicio.id !== id));
                  console.log(`Servicio con ID ${id} eliminado correctamente`);
                  Alert.alert('Éxito', 'Servicio eliminado correctamente.');
                } else {
                  Alert.alert('Error', response.message || 'No se pudo eliminar el servicio');
                }
                
                setLoading(false);
              })
              .catch(error => {
                console.error(`Error al eliminar servicio ${id}:`, error);
                Alert.alert('Error', 'Hubo un problema al eliminar el servicio.');
                setLoading(false);
              });
          }
        }
      ]
    );
  };

  const handleAddServicio = () => {
    navigation.navigate('ServicioForm', { refresh: fetchServicios });
  };

  const handleEditServicio = (servicio) => {
    navigation.navigate('ServicioForm', { servicio, refresh: fetchServicios });
  };

  const handleViewServicio = (servicioId) => {
    const servicio = servicios.find(s => s.id === servicioId);
    if (servicio) {
      Alert.alert(
        servicio.nombre,
        `Descripción: ${servicio.descripcion || 'Sin descripción'}\nPrecio: $${servicio.precio || 0}`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Error', 'No se encontraron datos del servicio');
    }
  };

  const formatPrecio = (precio) => {
    if (precio === undefined || precio === null) return '$0.00';
    return `$${parseFloat(precio).toFixed(2)}`;
  };

  const renderServicioItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.servicioCard}
      onPress={() => handleViewServicio(item.id)}
    >
      <View style={styles.servicioInfo}>
        <Text style={styles.servicioName}>{item.nombre}</Text>
        {item.descripcion ? (
          <Text style={styles.servicioDescription} numberOfLines={2}>
            {item.descripcion}
          </Text>
        ) : (
          <Text style={styles.servicioNoDescription}>Sin descripción</Text>
        )}
        <Text style={styles.precioBadge}>
          {formatPrecio(item.precio)}
        </Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]} 
          onPress={() => handleEditServicio(item)}
        >
          <Ionicons name="create-outline" size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]} 
          onPress={() => deleteServicio(item.id)}
        >
          <Ionicons name="trash-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#21588E', '#2FA0AD']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Servicios</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddServicio}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar servicios por nombre o precio..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#666"
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#21588E" />
        </View>
      ) : (
        <>
          {filteredServicios.length > 0 ? (
            <FlatList
              data={filteredServicios}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderServicioItem}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="cash-outline" size={60} color="#cccccc" />
              <Text style={styles.emptyText}>
                No se encontraron servicios
              </Text>
              {searchQuery ? (
                <Text style={styles.emptySubText}>
                  Intenta con otra búsqueda
                </Text>
              ) : (
                <Text style={styles.emptySubText}>
                  Agrega tu primer servicio
                </Text>
              )}
            </View>
          )}
        </>
      )}

      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={handleAddServicio}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerGradient: {
    height: 120,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  header: {
    height: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 15,
    borderRadius: 15,
    marginHorizontal: 20,
    marginTop: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 16,
    color: '#333',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 90,
  },
  servicioCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 15,
    marginVertical: 8,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  servicioInfo: {
    flex: 1,
  },
  servicioName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#21588E',
    marginBottom: 5,
  },
  servicioDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  servicioNoDescription: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#999',
  },
  precioBadge: {
    marginTop: 5,
    backgroundColor: '#e7f3ff',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    color: '#21588E',
    fontWeight: 'bold',
  },
  actionButtons: {
    justifyContent: 'space-around',
    alignItems: 'flex-end',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 3,
  },
  editButton: {
    backgroundColor: '#378DD0',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 25,
    right: 25,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#21588E',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
    marginTop: 15,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
});
