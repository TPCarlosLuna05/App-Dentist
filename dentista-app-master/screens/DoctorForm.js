import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  ScrollView,
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../services/api';

export default function DoctorForm() {
  const navigation = useNavigation();
  const route = useRoute();
  const isEditing = route.params?.doctor ? true : false;
  const initialDoctor = route.params?.doctor || {};

  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  
  // Campos del formulario del doctor
  const [nombre, setNombre] = useState(initialDoctor.nombre || '');
  const [correo, setCorreo] = useState(initialDoctor.correo || '');
  const [telefono, setTelefono] = useState(initialDoctor.telefono || '');
  const [especialidad, setEspecialidad] = useState(initialDoctor.especialidad || '');
  const [status, setStatus] = useState(initialDoctor.status || 'activo');
  
  // Campos del formulario del usuario
  const [usuario, setUsuario] = useState(initialDoctor.usuario || '');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState(initialDoctor.rol || 'doctor');
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    if (isEditing) {
      fetchDoctorUser();
    }
  }, [isEditing]);

  const fetchDoctorUser = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/doctores/${initialDoctor.id}`);
      if (response.status === 'success' && response.data.user) {
        setUserData(response.data.user);
        setUsuario(response.data.user.usuario || '');
        setRol(response.data.user.rol || 'doctor');
      }
    } catch (error) {
      console.error('Error obteniendo usuario del doctor:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre del doctor es obligatorio');
      return false;
    }
    if (!correo.trim()) {
      Alert.alert('Error', 'El correo electrónico es obligatorio');
      return false;
    }
    if (!telefono.trim()) {
      Alert.alert('Error', 'El teléfono es obligatorio');
      return false;
    }
    if (!status) {
      Alert.alert('Error', 'El estado es obligatorio');
      return false;
    }

    // Validaciones específicas para la creación
    if (!isEditing) {
      if (!usuario.trim()) {
        Alert.alert('Error', 'El nombre de usuario es obligatorio');
        return false;
      }
      if (!password.trim()) {
        Alert.alert('Error', 'El password es obligatorio');
        return false;
      }
      if (password.length < 8) {
        Alert.alert('Error', 'El password debe tener al menos 8 caracteres');
        return false;
      }
    }

    // Si estamos editando y hay password, validar longitud
    if (isEditing && password && password.length < 8) {
      Alert.alert('Error', 'El password debe tener al menos 8 caracteres');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaveLoading(true);
      console.log('Guardando datos del doctor...');

      const doctorData = {
        nombre,
        correo,
        telefono,
        especialidad,
        status
      };

      // Si estamos creando un nuevo doctor, incluimos los datos del usuario
      if (!isEditing) {
        doctorData.usuario = usuario;
        doctorData.password = password;
        doctorData.rol = rol;
        
        console.log('Enviando datos para crear doctor:', doctorData);
        
        // Realizar la solicitud a la API
        const response = await api.post('/doctores', doctorData);
        
        console.log('Respuesta recibida:', response);
        
        if (response.status === 'success') {
          Alert.alert('Éxito', 'Doctor creado exitosamente');
          navigation.goBack();
        } else {
          Alert.alert('Error', response.message || 'No se pudo crear el doctor');
        }
      } 
      // Si estamos editando, enviamos los datos del doctor y opcionalmente los del usuario
      else {
        // Solo incluimos los datos de usuario si han sido modificados
        if (usuario !== userData?.usuario) {
          doctorData.usuario = usuario;
        }
        if (password) {
          doctorData.password = password;
        }
        if (rol !== userData?.rol) {
          doctorData.rol = rol;
        }

        console.log('Enviando datos para actualizar doctor:', doctorData);
        
        const response = await api.put(`/doctores/${initialDoctor.id}`, doctorData);
        
        console.log('Respuesta recibida:', response);
        
        if (response.status === 'success') {
          Alert.alert('Éxito', 'Doctor actualizado exitosamente');
          navigation.goBack();
        } else {
          Alert.alert('Error', response.message || 'No se pudo actualizar el doctor');
        }
      }
    } catch (error) {
      console.error('Error guardando doctor:', error);
      
      // Mostrar información detallada del error para depuración
      console.log('Detalles del error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      let errorMessage = 'Hubo un problema al guardar los datos';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#21588E" />
        <Text style={styles.loadingText}>Cargando datos del doctor...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>
          {isEditing ? 'Editar Doctor' : 'Nuevo Doctor'}
        </Text>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Información del Doctor</Text>
          
          <Text style={styles.inputLabel}>Nombre</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre completo"
            value={nombre}
            onChangeText={setNombre}
          />

          <Text style={styles.inputLabel}>Correo Electrónico</Text>
          <TextInput
            style={styles.input}
            placeholder="correo@ejemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={correo}
            onChangeText={setCorreo}
          />

          <Text style={styles.inputLabel}>Teléfono</Text>
          <TextInput
            style={styles.input}
            placeholder="Número de teléfono"
            keyboardType="phone-pad"
            value={telefono}
            onChangeText={setTelefono}
          />

          <Text style={styles.inputLabel}>Especialidad</Text>
          <TextInput
            style={styles.input}
            placeholder="Especialidad (opcional)"
            value={especialidad}
            onChangeText={setEspecialidad}
          />

          <Text style={styles.inputLabel}>Estado</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={status}
              style={styles.picker}
              onValueChange={(itemValue) => setStatus(itemValue)}
            >
              <Picker.Item label="Activo" value="activo" />
              <Picker.Item label="Inactivo" value="inactivo" />
              <Picker.Item label="Vacaciones" value="vacaciones" />
              <Picker.Item label="Licencia" value="licencia" />
            </Picker>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Datos de Acceso</Text>
          
          <Text style={styles.inputLabel}>Nombre de Usuario</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre de usuario"
            autoCapitalize="none"
            value={usuario}
            onChangeText={setUsuario}
            editable={!isEditing || (isEditing && userData)} // Solo editable si es nuevo o si ya tenemos los datos cargados
          />

          <Text style={styles.inputLabel}>
            {isEditing ? 'Password (dejar en blanco para mantener actual)' : 'Password'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={isEditing ? "Dejar en blanco para mantener el password actual" : "Password (mínimo 8 caracteres)"}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Text style={styles.inputLabel}>Rol</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={rol}
              style={styles.picker}
              onValueChange={(itemValue) => setRol(itemValue)}
            >
              <Picker.Item label="Doctor" value="doctor" />
              <Picker.Item label="Administrador" value="admin" />
            </Picker>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saveLoading}
        >
          {saveLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {isEditing ? 'Actualizar' : 'Guardar'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={saveLoading}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
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
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#21588E',
    textAlign: 'center',
  },
  formSection: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#444',
  },
  inputLabel: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  pickerContainer: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginBottom: 15,
  },
  picker: {
    height: 50,
  },
  saveButton: {
    backgroundColor: '#21588E',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});
