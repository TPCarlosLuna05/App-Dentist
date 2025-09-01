import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../services/api';

export default function ServicioForm() {
  const navigation = useNavigation();
  const route = useRoute();
  const { servicio, refresh } = route.params || {};
  const isEditing = !!servicio;
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
  });

  useEffect(() => {
    if (isEditing && servicio) {
      setFormData({
        nombre: servicio.nombre || '',
        descripcion: servicio.descripcion || '',
        precio: servicio.precio ? servicio.precio.toString() : '',
      });
    }
  }, [isEditing, servicio]);

  const handleChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  // Validación para el campo precio (solo números y punto decimal)
  const handlePrecioChange = (value) => {
    // Permite solo números y un punto decimal
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      handleChange('precio', value);
    }
  };

  const validateForm = () => {
    if (!formData.nombre.trim()) {
      Alert.alert('Error', 'El nombre del servicio es obligatorio');
      return false;
    }

    if (!formData.precio) {
      Alert.alert('Error', 'El precio del servicio es obligatorio');
      return false;
    }

    if (isNaN(parseFloat(formData.precio)) || parseFloat(formData.precio) < 0) {
      Alert.alert('Error', 'El precio debe ser un número válido mayor o igual a 0');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      // Datos a enviar al servidor
      const dataToSend = {
        nombre: formData.nombre,
        descripcion: formData.descripcion || '',
        precio: parseFloat(formData.precio),
      };
      
      // Para depuración
      console.log(`Enviando solicitud ${isEditing ? 'PUT' : 'POST'} para servicio`);
      console.log('Datos enviados:', JSON.stringify(dataToSend, null, 2));
      
      let response;
      if (isEditing) {
        response = await api.updateServicio(servicio.id, dataToSend);
      } else {
        response = await api.createServicio(dataToSend);
      }

      setLoading(false);
      
      if (response.success) {
        handleSuccessResponse();
      } else {
        console.error('Error en la respuesta:', response);
        Alert.alert('Error', response.message || 'Hubo un problema al guardar el servicio');
      }
    } catch (error) {
      setLoading(false);
      console.error('Error al guardar servicio:', error);
      Alert.alert('Error', 'Hubo un problema al conectar con el servidor');
    }
  };
  
  // Función para manejar respuestas exitosas
  const handleSuccessResponse = () => {
    const message = isEditing 
      ? 'Servicio actualizado correctamente' 
      : 'Servicio creado correctamente';
    
    console.log(message);
    
    Alert.alert(
      'Éxito', 
      message,
      [{ 
        text: 'OK', 
        onPress: () => {
          if (typeof refresh === 'function') {
            refresh();
          }
          navigation.goBack();
        }
      }]
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
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
          <Text style={styles.headerTitle}>
            {isEditing ? 'Editar Servicio' : 'Nuevo Servicio'}
          </Text>
          <View style={{ width: 40 }}></View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nombre del Servicio*</Text>
          <TextInput
            style={styles.input}
            value={formData.nombre}
            onChangeText={(value) => handleChange('nombre', value)}
            placeholder="Ej. Limpieza dental, Extracción, etc."
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Descripción</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={formData.descripcion}
            onChangeText={(value) => handleChange('descripcion', value)}
            placeholder="Descripción detallada del servicio"
            multiline
            numberOfLines={5}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Precio*</Text>
          <View style={styles.priceInputContainer}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={[styles.input, styles.priceInput]}
              value={formData.precio}
              onChangeText={handlePrecioChange}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>
              {isEditing ? 'Actualizar Servicio' : 'Guardar Servicio'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
  formContainer: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 10,
    color: '#21588E',
  },
  priceInput: {
    flex: 1,
  },
  multilineInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#21588E',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
