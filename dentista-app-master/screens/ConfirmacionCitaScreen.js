import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Clipboard,
  ToastAndroid,
  Platform,
  Alert,
  Linking
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const ConfirmacionCitaScreen = ({ route, navigation }) => {
  // Extraer los datos correctamente de la estructura potencialmente anidada
  const { cita: citaParam, confirmationUrl: urlParam, origen = 'ConsultasScreen' } = route.params || {};
  const [copiado, setCopiado] = useState(false);
  
  // Asegurarnos de tener la estructura correcta de los datos de la cita
  // Verificar si la cita tiene una estructura anidada
  const cita = citaParam?.data || citaParam || {};
  
  // Extraer la URL de confirmación de cualquiera de las posibles ubicaciones
  const confirmationUrl = citaParam?.confirmation_url || urlParam || '';

  // Formatear fecha para mostrarla en formato legible
  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return 'Fecha no disponible';
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Formatear hora para mostrarla en formato legible
  const formatearHora = (horaStr) => {
    // Verificar si horaStr está definido
    if (!horaStr) return 'Hora no disponible';
    
    // Asumiendo que horaStr está en formato HH:MM:SS o HH:MM
    return horaStr.includes(':') ? horaStr.substring(0, 5) : horaStr;
  };

  // Función para compartir enlace
  const compartirEnlace = async () => {
    try {
      const pacienteNombre = cita.paciente?.nombre || 'Paciente';
      const doctorNombre = cita.doctor?.nombre || 'Doctor';
      const fecha = formatearFecha(cita.fecha);
      const hora = formatearHora(cita.hora);
      const servicio = cita.serviciosDirectos?.[0]?.nombre || cita.procedimiento?.nombre || 'Consulta';
      
      // Usar la URL de confirmación que viene del backend
      const urlConfirmacion = confirmationUrl || 'URL no disponible';

      const mensaje = 
        `🏥 *Confirmación de Cita Médica* 🏥\n\n` +
        `Hola ${pacienteNombre},\n\n` +
        `Tu cita con ${doctorNombre} está programada para el ${fecha} a las ${hora}.\n` +
        `Servicio: ${servicio}\n\n` +
        `Por favor confirma tu asistencia haciendo clic en el siguiente enlace:\n${urlConfirmacion}\n\n` +
        `*Importante:* Este enlace expira en 7 días.`;

      const result = await Share.share({
        message: mensaje,
        title: 'Confirmación de Cita Médica'
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log(`Compartido con: ${result.activityType}`);
        } else {
          console.log('Compartido');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo compartir el enlace');
    }
  };

  // Función para copiar el enlace al portapapeles
  const copiarEnlace = () => {
    if (!confirmationUrl) {
      Alert.alert('Error', 'No hay un enlace de confirmación disponible');
      return;
    }
    
    Clipboard.setString(confirmationUrl);
    
    // Mostrar confirmación según plataforma
    if (Platform.OS === 'android') {
      ToastAndroid.show('Enlace copiado al portapapeles', ToastAndroid.SHORT);
    } else {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  // Función para abrir WhatsApp con el enlace
  const abrirWhatsApp = async () => {
    try {
      if (!confirmationUrl) {
        Alert.alert('Error', 'No hay un enlace de confirmación disponible');
        return;
      }
      
      const pacienteNombre = cita.paciente?.nombre || 'Paciente';
      const doctorNombre = cita.doctor?.nombre || 'Doctor';
      const fecha = formatearFecha(cita.fecha);
      const hora = formatearHora(cita.hora);
      const servicio = cita.serviciosDirectos?.[0]?.nombre || cita.procedimiento?.nombre || 'Consulta';
      
      const mensaje = 
        `🏥 *Confirmación de Cita Médica* 🏥\n\n` +
        `Hola ${pacienteNombre},\n\n` +
        `Tu cita con ${doctorNombre} está programada para el ${fecha} a las ${hora}.\n` +
        `Servicio: ${servicio}\n\n` +
        `Por favor confirma tu asistencia haciendo clic en el siguiente enlace:\n${confirmationUrl}`;
      
      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(mensaje)}`;
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        Alert.alert('Error', 'WhatsApp no está instalado en este dispositivo');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo abrir WhatsApp');
    }
  };
  
  // Función para abrir enlace en navegador
  const abrirEnNavegador = async () => {
    try {
      if (!confirmationUrl) {
        Alert.alert('Error', 'No hay un enlace de confirmación disponible');
        return;
      }
      
      const canOpen = await Linking.canOpenURL(confirmationUrl);
      if (canOpen) {
        await Linking.openURL(confirmationUrl);
      } else {
        Alert.alert('Error', 'No se puede abrir este enlace');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo abrir el enlace');
    }
  };

  // Si no hay datos de cita o URL de confirmación, mostrar mensaje de error
  if (!cita || !confirmationUrl) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 18, textAlign: 'center' }}>No se pudo cargar la información de la cita.</Text>
        <TouchableOpacity 
          style={[styles.doneButton, { marginTop: 20, width: '80%' }]}
          onPress={() => navigation.replace(origen || 'ConsultasScreen')}
        >
          <Text style={styles.doneButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.headerContainer}>
          <Icon name="check-circle" size={40} color="#4CAF50" />
          <Text style={styles.title}>¡Cita Creada con Éxito!</Text>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.detailsContainer}>
          <Text style={styles.sectionTitle}>Detalles de la cita:</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Paciente:</Text>
            <Text style={styles.detailValue}>{cita.paciente?.nombre}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Doctor:</Text>
            <Text style={styles.detailValue}>{cita.doctor?.nombre}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Fecha:</Text>
            <Text style={styles.detailValue}>{formatearFecha(cita.fecha)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Hora:</Text>
            <Text style={styles.detailValue}>{formatearHora(cita.hora)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Estado:</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{cita.estado}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.confirmationSection}>
          <Text style={styles.sectionTitle}>Enlace de confirmación:</Text>
          <Text style={styles.confirmationDescription}>
            Para que el paciente confirme la cita, debe hacer clic en el siguiente enlace:
          </Text>
          
          <View style={styles.linkContainer}>
            <Text style={styles.linkText} numberOfLines={1} ellipsizeMode="middle">
              {confirmationUrl}
            </Text>
          </View>
          
          {copiado && (
            <Text style={styles.copiedText}>¡Enlace copiado!</Text>
          )}
          
          <Text style={styles.noteText}>
            Nota: El enlace expira en 7 días.
          </Text>
          
          <Text style={styles.sectionTitle}>Compartir enlace:</Text>
          
          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.whatsappButton]} 
              onPress={abrirWhatsApp}
            >
              <Icon name="whatsapp" size={20} color="white" />
              <Text style={styles.actionButtonText}>WhatsApp</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.shareButton]} 
              onPress={compartirEnlace}
            >
              <Icon name="share-variant" size={20} color="white" />
              <Text style={styles.actionButtonText}>Compartir</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.copyButton]} 
              onPress={copiarEnlace}
            >
              <Icon name="content-copy" size={20} color="white" />
              <Text style={styles.actionButtonText}>Copiar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.browserButton]} 
              onPress={abrirEnNavegador}
            >
              <Icon name="web" size={20} color="white" />
              <Text style={styles.actionButtonText}>Abrir</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.doneButton}
          onPress={() => navigation.replace(origen || 'ConsultasScreen')}
        >
          <Text style={styles.doneButtonText}>Finalizar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 15,
  },
  detailsContainer: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  detailLabel: {
    width: 80,
    fontWeight: 'bold',
    color: '#666',
  },
  detailValue: {
    flex: 1,
    color: '#333',
  },
  statusBadge: {
    backgroundColor: '#FFF9C4',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    color: '#FF8F00',
    fontWeight: '500',
  },
  confirmationSection: {
    marginBottom: 20,
  },
  confirmationDescription: {
    marginBottom: 10,
    color: '#555',
    lineHeight: 20,
  },
  linkContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 6,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  linkText: {
    color: '#2196F3',
  },
  noteText: {
    fontSize: 12,
    color: '#757575',
    fontStyle: 'italic',
    marginBottom: 15,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 6,
    marginHorizontal: 5,
  },
  whatsappButton: {
    backgroundColor: '#25D366',
  },
  shareButton: {
    backgroundColor: '#FF5722',
  },
  copyButton: {
    backgroundColor: '#607D8B',
  },
  browserButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  doneButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 6,
    alignItems: 'center',
  },
  doneButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  copiedText: {
    color: '#4CAF50',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 10,
  },
});

export default ConfirmacionCitaScreen;
